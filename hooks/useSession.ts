import { supabase } from '@/services/supabaseClient';
import { useEffect, useState, useRef } from 'react';

export const useSession = ({ setIsLoading, setShowIntro }) => {
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        // 1. Pega a sessão atual ao carregar a página
        const initializeAuth = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);

            // 3. Caso a sessão exista, ele seta null
            if(!currentSession)
                setSession(null);
        };

        initializeAuth();

        // 2. Escuta mudanças na autenticação (Login/Logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);

            if(newSession) {
                setIsLoading(false);
                setShowIntro(false);
            } else {
                setSession(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

  return { session };
}