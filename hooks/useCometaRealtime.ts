import { supabase } from '../services/supabaseClient'
import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

export interface CometaGame {
  id: string
  status: 'betting' | 'flying' | 'crashed'
  time_left: number
  multiplier: number
  crash_point?: number
  seed?: string
  created_at: string
  updated_at: string
  server_start_time: number
  betting_start_time: number
  betting_duration?: number
}

function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generateHumanAmount() {
  const r = Math.random();

  if (r < 0.5) return randomFloat(5, 30);       // maioria aposta baixo
  if (r < 0.85) return randomFloat(30, 120);   // médio
  return randomFloat(120, 500);                // poucos grandes
}

function generateCashoutTarget() {
  const r = Math.random();

  if (r < 0.35) return randomFloat(1.2, 1.6);   // medrosos
  if (r < 0.75) return randomFloat(1.6, 2.5);   // médios
  if (r < 0.9) return randomFloat(2.5, 4.5);    // gananciosos
  return null; // 10% nunca saem (perdem)
}

export function useCometaRealtime(profile : any | null) {
  const [game, setGame] = useState<CometaGame | null>(null)
  const [activeBet, setActiveBet] = useState<any>(null)
  const [bets, setBets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasCashout, setHasCashout] = useState(false)
  const [cashoutAmount, setCashoutAmount] = useState(0)
  const lastStatusRef = useRef<string | null>(null);
  const fakeBetSessionRef = useRef(0);
  const timeOutQueue = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    setActiveBet(null)
    setHasCashout(false)
    setCashoutAmount(0)
  }, [game?.id]);

  // Fetch inicial
  useEffect(() => {
    if (!profile?.id) return;
    const fetchInitialGame = async () => {
      const { data } = await supabase
        .from('cometa_games_public')
        .select('*')
        // .not('status', 'eq', 'crashed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      setGame(data ?? null)
      setIsLoading(false)
    }
    fetchInitialGame()
  }, [profile?.id])

  // 2️⃣ Buscar aposta do usuário para esse jogo
  useEffect(() => {
    if (!profile?.id || !game?.id) return

    const fetchBet = async () => {
      const { data } = await supabase
        .from('cometa_bets')
        .select('bet_amount, cashout_multiplier')
        .eq('user_id', profile.id)
        .eq('game_id', game.id)
        .maybeSingle()

      setActiveBet(data ?? null)
    }

    fetchBet()
  }, [profile?.id, game?.id])

  // ✅ REALTIME CORRETO - Sintaxe Supabase v2
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('cometa_games')
      .on('postgres_changes', {
        event: '*',  // ← CORRIGIDO: string simples
        schema: 'public',
        table: 'cometa_games_public'
      }, (payload) => {

        // Se for crash, limpa as bets
        // if (payload.new.status === 'crashed') {
        //   setBets([])
        // }

        setGame(payload.new as CometaGame)
      })
      .subscribe((status) => {
        //console.log('✅ Channel:', status)
        if (status === 'SUBSCRIBED') setIsLoading(false)
      })

    return () => supabase.removeChannel(channel)
  }, [profile?.id])

  useEffect(() => {
  if (!game?.id || !profile?.id) return;

  const channel = supabase
    .channel('cometa_bets_realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cometa_bets',
        //filter: `game_id=eq.${game.id}` // todas apostas do jogo atual
      },
      (payload) => {
        const newBet = payload.new;
        const oldBet = payload.old;

        setBets((prev) => {
          let updated = [...prev];

          if (payload.eventType === 'INSERT' && newBet) {
            if (newBet.cashout_multiplier == null && newBet.won_amount === 0) {
              updated.push(newBet);
            }
          } else if (payload.eventType === 'UPDATE' && newBet) {
            if (newBet.cashout_multiplier != null || newBet.won_amount > 0) {
              updated = updated.filter((b) => b.id !== newBet.id);
            } else {
              updated = updated.map((b) => (b.id === newBet.id ? newBet : b));
            }
          } else if (payload.eventType === 'DELETE' && oldBet) {
            updated = updated.filter((b) => b.id !== oldBet.id);
          }

          return updated;
        });

        // Atualiza a aposta do usuário logado, independente de quem fez o evento
        if (newBet && newBet.user_id === profile.id) {
          setActiveBet(newBet);
        } else if (oldBet && oldBet.user_id === profile.id && payload.eventType === 'DELETE') {
          setActiveBet(null);
        }
      }
    )
    .subscribe((status) => {
        //console.log('✅ Channel das Bets:', status)
        
      })

  return () => supabase.removeChannel(channel);
}, [game?.id, profile?.id]);

  
  //  Prevenção de bugs: as vezes quando fica muito tempo inativo, o canal de realtime pode falhar em receber updates. Esse efeito tenta re-sincronizar a aposta atual a cada 30s, para evitar que o usuário fique "desatualizado" sem perceber.
  // useEffect(() => {
  //   if (!profile?.id || !game?.id) return;
  //   // console.log("Iniciando monitoramento de aposta ativa...");
  //   const interval = setInterval(() => {
  //     // console.log("Re-sincronizando aposta ativa...");
  //     setActiveBet(null);
  //   }, 30000);
  //   return () => clearInterval(interval);
  // }, [profile?.id, game?.id]);

  // ⚡ limpa apostas quando novo jogo começa em betting
  useEffect(() => {
    if (!game || !profile?.id) return;
    

    if (game.status === 'flying') {

      //console.log("limpa fila porra!");
      //console.log(timeOutQueue.current);
      timeOutQueue.current.forEach(timeout => clearTimeout(timeout));
      timeOutQueue.current = [];

      const interval = setInterval(() => {
      setBets(prev => {
        return prev.filter(bet => {
          if (!bet.isFake) return true;

          // se não tem alvo, nunca sai (vai perder)
          if (!bet.cashoutAt) return true;

          // sai quando multiplicador ultrapassa alvo
          if (game.multiplier >= bet.cashoutAt) {
            // chance de micro atraso humano
            if (Math.random() < 0.7) {
              return false;
            }
          }

          return true;
        });
      });
    }, random(120, 290)); // intervalo irregular

    return () => clearInterval(interval);
    }
    
    
    if (game.status === 'betting' && lastStatusRef.current !== 'betting') {
      // novo jogo, zera as apostas
      setBets([]);
      setActiveBet(null);
      setHasCashout(false);
      setCashoutAmount(0);
      

      
      const total = Math.floor(Math.random() * 15) + 40; // 17–25
      let inserted = 0;

      function scheduleNext(lastStatus: string) {
        if (inserted >= total) return;
        if (lastStatus === 'flying') return;

        const fakeBet = {
          id: `fake-${Date.now()}-${inserted}`,
          user_id: `fake-${inserted}`,
          bet_amount: generateHumanAmount(),
          isFake: true,
          cashoutAt: generateCashoutTarget(),
          game_id: game.id
        };

        
        setBets(prev => [...prev, fakeBet]);
        inserted++;

        // intervalo humano
        let delay;

        if (inserted < total * 0.4) {
          // início acelerado
          delay = random(100, 210);
        } else if (inserted < total * 0.7) {
          delay = random(230, 770);
        } else {
          delay = random(300, 1800);
        }

        // chance de burst (entradas juntas)
        if (Math.random() < 0.25) {
          delay = random(40, 90);
        }

        timeOutQueue.current.push(setTimeout(scheduleNext, delay, lastStatus));
        // setTimeout(scheduleNext, delay);
      }


      scheduleNext(game.status || 'flying'); // inicia a cadeia de apostas fake

    }

    lastStatusRef.current = game.status;
  }, [game?.id, game?.status, game?.multiplier, profile?.id]);
  // useEffect(() => {
  //   if (!profile?.id) return

  //   const channel = supabase
  //     .channel('cometa_bets')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'cometa_bets',
  //         filter: `user_id=eq.${profile.id}`
  //       },
  //       (payload) => {
  //         if (payload.new) {
  //           setActiveBet(payload.new)
  //         } else {
  //           setActiveBet(null)
  //         }
  //       }
  //     )
  //     .subscribe()

  //   return () => {
  //     supabase.removeChannel(channel)
  //   }
  // }, [profile?.id])

  const cashout = useCallback(async () => {
    if (!profile?.id){
      //console.log("não há profile! deslogado.");
      //console.log(profile);
      return;
    };
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error("Sessão expirada")
        return
      }

      const res = await fetch(
        "https://fycadvyrbqaqdvspmrtg.supabase.co/functions/v1/cashout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      const data = await res.json()

      if (!res.ok || data?.error) {
        toast.error(data?.error || "Erro no saque")
        return
      }

      toast.success(`🚀 Sacado R$ ${(data.amount)}`);
      setHasCashout(true)
      setCashoutAmount(data.amount)
      
    } catch (err: any) {
      toast.error(err.message)
    }
  }, [profile?.id])

  // Apostas - FIX user_id
  const placeBet = useCallback(async (amount: number) => {
    if (!profile?.id) return;
    const { data, error } = await supabase.rpc('place_cometa_bet', {
      p_user_id: profile.id,
      p_amount: amount
    })

    if (error || data?.error) {
      toast.error(data?.error || error?.message)
      return
    }

    toast.success(`✅ Aposta realizada!`)
  }, [profile?.id])

  return { game, isLoading, placeBet, activeBet, bets, cashout, hasCashout, cashoutAmount }
}
