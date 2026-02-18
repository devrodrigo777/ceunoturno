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
}

export function useCometaRealtime() {
  const [game, setGame] = useState<CometaGame | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch inicial
  useEffect(() => {
    const fetchInitialGame = async () => {
      const { data } = await supabase
        .from('cometa_games')
        .select('*')
        .not('status', 'eq', 'crashed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      setGame(data ?? null)
      setIsLoading(false)
    }
    fetchInitialGame()
  }, [])

  // ✅ REALTIME CORRETO - Sintaxe Supabase v2
  useEffect(() => {
    const channel = supabase
      .channel('cometa_games')
      .on('postgres_changes', {
        event: '*',  // ← CORRIGIDO: string simples
        schema: 'public',
        table: 'cometa_games'
      }, (payload) => {
        console.log('🪨 Realtime:', payload)
        
        // Refetch jogo ativo
        supabase
          .from('cometa_games')
          .select('*')
          .not('status', 'eq', 'crashed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
          .then(({ data, error }) => {
            if (!error) setGame(data ?? null)
          })
      })
      .subscribe((status) => {
        console.log('✅ Channel:', status)
        if (status === 'SUBSCRIBED') setIsLoading(false)
      })

    return () => supabase.removeChannel(channel)
  }, [])

  // Apostas - FIX user_id
  const placeBet = useCallback(async (amount: number) => {
    if (!game?.id) {
      toast.error('Nenhum jogo ativo!')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Faça login!')
      return
    }

    const { error } = await supabase
      .from('cometa_bets')
      .insert({ 
        game_id: game.id, 
        bet_amount: amount,
        user_id: user.id  // ← FIX: await removido
      })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`✅ ${amount} poeiras apostadas!`)
    }
  }, [game?.id])

  return { game, isLoading, placeBet }
}
