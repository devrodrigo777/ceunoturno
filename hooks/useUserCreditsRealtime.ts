import React, { useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { toast } from 'sonner';
import type { User } from '@/types';

type sessionLike = any;

type Params = {
  session: sessionLike | null;
  setUser: React.Dispatch<React.SetStateAction<User>>;
}

const DEFAULT_USER: User = {
    id: 'u1',
    name: 'Explorador',
    balance: 0,
    total_referral_commission: 0,
}

export function useUserCreditsRealtime({ session, setUser}: Params) {
useEffect(() => {
    const fetchUserProfile = async () => {
      // 1. Verifica se temos um usuário logado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 2. Busca o saldo na tabela 'profiles'
        const { data, error } = await supabase
          .from('profiles')
          .select('credits, full_name, avatar_url, total_referral_commission')
          .eq('id', session.user.id)
          .single();

        if (error) {
          toast.error(`Erro ao carregar créditos: ${error.message}`);
        } else if (data) {
          setUser((prev) => ({
            ...prev,
            balance: data.credits,
            total_referral_commission: data.total_referral_commission,
          }))
        }
      }
    };

    fetchUserProfile();

    // 3. Opcional: Escutar mudanças no Auth (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile();
      } else {
        setUser({ id: 'u1', name: 'Explorador', balance: 0, total_referral_commission: 0 });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;

    const profileChannel = supabase
      .channel('perfil_realtime')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${session.user.id}` 
        },
        (payload) => {
          // Quando o banco mudar (pela RPC ou admin), o estado muda na hora
          //console.log("Profile atualizado: ", payload.new);
          setUser((prevUser) => ({
            ...prevUser,
            balance: payload.new.credits,
            total_referral_commission: payload.new.total_referral_commission,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [session?.user.id]);
}