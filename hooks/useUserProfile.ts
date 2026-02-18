import { supabase } from '@/services/supabaseClient';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  credits: number;
  total_referral_comission: number; // saldo jogo Cometa!
  fullname?: string;
  cpf?: string;
  avatar_url?: string;
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, credits, total_referral_commission, full_name, cpf, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        //console.error('Erro ao buscar perfil:', error);
        toast.error('Erro ao carregar perfil. Tente novamente mais tarde.');
      }

      setProfile(data ?? null);
      setLoading(false);
    };

    fetchProfile();

    // Realtime: escuta updates no próprio perfil (credits, saldo jogo)
    const profileChannel = supabase
      .channel('user-profile')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${supabase.auth.getUser()?.then(({ data }) => data.user?.id)}`
        }, 
        (payload) => setProfile(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(profileChannel);
  }, []);

  return { profile, loading };
};
