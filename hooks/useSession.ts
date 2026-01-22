import { supabase } from '@/services/supabaseClient';
import { useEffect, useState, useRef } from 'react';

export const useSession = ({ setIsLoading, setShowIntro }) => {
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        // 1. Pega a sessão atual ao carregar a página
        const initializeAuth = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);

            // 3. Caso a sessão exista, ele irá dar refresh, então pularemos splash e apresentação
            // if(currentSession) {
            //     setIsLoading(false);
            //     setShowIntro(false);
            // } else
            //     setIsLoading(false);
        };

        initializeAuth();

        // 2. Escuta mudanças na autenticação (Login/Logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);

            if(newSession) {
                setIsLoading(false);
                setShowIntro(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

  return { session };
}