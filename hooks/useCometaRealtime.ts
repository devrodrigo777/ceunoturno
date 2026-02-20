import { supabase } from '../services/supabaseClient'
import { useEffect, useState, useCallback } from 'react'
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

export function useCometaRealtime(profile : any | null) {
  const [game, setGame] = useState<CometaGame | null>(null)
  const [activeBet, setActiveBet] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasCashout, setHasCashout] = useState(false)
  const [cashoutAmount, setCashoutAmount] = useState(0)

  useEffect(() => {
    setActiveBet(null)
    setHasCashout(false)
    setCashoutAmount(0)
  }, [game?.id]);

  // Fetch inicial
  useEffect(() => {
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
  }, [])

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
    const channel = supabase
      .channel('cometa_games')
      .on('postgres_changes', {
        event: '*',  // ← CORRIGIDO: string simples
        schema: 'public',
        table: 'cometa_games_public'
      }, (payload) => {
        console.log("Mudança:");
        console.log(payload.new);
        setGame(payload.new as CometaGame)
      })
      .subscribe((status) => {
        console.log('✅ Channel:', status)
        if (status === 'SUBSCRIBED') setIsLoading(false)
      })

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel('cometa_bets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cometa_bets',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          if (payload.new) {
            setActiveBet(payload.new)
          } else {
            setActiveBet(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  const cashout = useCallback(async () => {
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
  }, [])

  // Apostas - FIX user_id
  const placeBet = useCallback(async (amount: number) => {
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

  return { game, isLoading, placeBet, activeBet, cashout, hasCashout, cashoutAmount }
}
