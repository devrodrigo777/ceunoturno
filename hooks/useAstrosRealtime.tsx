import React, { useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import type { Astro } from '@/types';
import { toast } from 'sonner';
import { subscribe } from 'diagnostics_channel';

type ToastLike = {
  custom: (renderer: (t: any) => any, opts?: any) => any;
  dismiss: (id?: any) => any;
  error: (message: string) => any;
};



type Params = {
  setAstros: React.Dispatch<React.SetStateAction<Astro[]>>;
  setPulseFx: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  toast: ToastLike;
  sessionUserIdRef: React.MutableRefObject<string | null>;
  targetOff: React.MutableRefObject<{ x: number; y: number }>;
  currentZoom: React.MutableRefObject<number>;
}

export function useAstrosRealtime({
  setAstros,
  setPulseFx,
  toast,
  sessionUserIdRef,
  targetOff,
  currentZoom,
}: Params) {

  useEffect(() => {
    const fetchAstros = async () => {
      const { data, error } = await supabase
        .from('astros')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        toast.error(`Erro ao carregar astros: ${error.message}`);
      } else {
        setAstros(data || []);
      }
    };

    fetchAstros();


    // 2. Escuta em Tempo Real (Realtime)
    // Criamos um canal que "ouve" qualquer INSERT na tabela 'astros'
    const channel = supabase
      .channel('mapa_total')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'astros' }, // O '*' captura tudo
        (payload: any) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          const userId = sessionUserIdRef.current;

          if (eventType === 'INSERT') {
            const novoAstro = payload.new as Astro;
            setAstros((prev) => {
              // Regra de ouro: nunca adicionar se o ID já existir no estado
              if (prev.find(a => a.id === novoAstro.id)) {
                return prev;
              }
              return [...prev, novoAstro];
            });

            // 2. Opcional: Se o usuário não for quem criou, mostrar uma pequena notificação
            if (novoAstro.user_id !== userId) {
              toast.custom(
                (t: any) => (
                  <div className="flex flex-col gap-3 p-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ backgroundColor: novoAstro.color, boxShadow: `0 0 10px ${novoAstro.color}` }}
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Novo astro descoberto</span>
                        <span className="text-xs text-slate-200">
                          Alguém deixou uma nova mensagem no cosmos!
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        targetOff.current = { x: -(novoAstro.x * currentZoom.current) + window.innerWidth / 2, y: -(novoAstro.y * currentZoom.current) + window.innerHeight / 2 };
                        toast.dismiss(t); // Fecha o toast após clicar
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors border border-indigo-400/30"
                    >
                      Viajar até a coordenada <i className="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                  </div>
                ), { duration: 5000 });

              // 2. Opcional: tocar um som sutil de "plim" aqui
              // const audio = new Audio('/sounds/star-birth.mp3');
              // audio.volume = 0.2;
              // audio.play().catch(() => {}); // Ignora erro se browser bloquear som
            }
          }

          if (eventType === 'UPDATE') {
            const updated = newRow as Astro;

            setAstros(prev => {
              const prevAstro = prev.find(a => a.id === updated.id);
              const prevP = prevAstro?.pulses ?? 0;
              const nextP = updated.pulses ?? 0;

              if (nextP > prevP) {
                setPulseFx(fx => ({ ...fx, [updated.id]: Date.now() }));
                // opcional somzinho aqui, como você já faz no INSERT [file:1]
                // new Audio("/sounds/pulse.mp3").play().catch(() => {});
              }

              return prev.map(a => (a.id === updated.id ? updated : a));
            });
          }

          if (eventType === 'DELETE') {
            setAstros((prev) => prev.filter((astro) => astro.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setAstros, setPulseFx, toast, sessionUserIdRef, targetOff, currentZoom]);
};
