import { supabase } from '@/services/supabaseClient';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  credits: number;
  total_referral_commission: number; // saldo jogo Cometa!
  fullname?: string;
  cpf?: string;
  avatar_url?: string;
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileChannel: any

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      // 🔹 busca inicial
      const { data, error } = await supabase
        .from('profiles')
        .select('id, credits, total_referral_commission, full_name, cpf, avatar_url')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        toast.error('Erro ao carregar perfil.')
      }

      setProfile(data ?? null)
      setLoading(false)

      // 🔹 realtime correto
      profileChannel = supabase
        .channel(`user-profile-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            setProfile(payload.new)
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel)
    }
  }, [])

  return { profile, loading };
};
