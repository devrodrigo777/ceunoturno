import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Astro, AstroPosition, User, AstroType } from './types';
import { POSITION_PRICES, TYPE_PRICES, ASTRO_COLORS, INITIAL_ASTROS, CENTER_LIMITS, PRICES } from './constants';
import AstroItem from './components/AstroItem';
import Modal from './components/Modal';
import FullscreenPrompt from './components/FullScreenPrompt';
import SplashScreen from './components/SplashScreen';
import ModalSobre from './components/ModalSobre';
import { supabase } from './services/supabaseClient';
import FullscreenMonitor from './components/FullScreenMonitor';
import UserDashboard from './components/UserDashboard';
import { Toaster, toast } from 'sonner';

const SKY_W = 4000;
const SKY_H = 3000;
const FRICTION = 0.90;
const LERP = 0.05;
const MIN_Z = 0.95;
const MAX_Z = 1.5;
const DRAG_SENSITIVITY = 1; // Fator para controlar a sensibilidade do arrasto
const MIN_ASTRO_DISTANCE = 120; // Distância mínima de segurança entre astros

const App: React.FC = () => {
  const [astros, setAstros] = useState<Astro[]>(INITIAL_ASTROS);
  const [user, setUser] = useState<User>({ id: 'u1', name: 'Explorador', balance: 2500 });
  const [selectedAstro, setSelectedAstro] = useState<Astro | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // Modal Sobre State
  const [isModalSobreOpen, setIsModalSobreOpen] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  // Click position marker
  const [clickMarker, setClickMarker] = useState<{x: number, y: number} | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const [pendingCoords, setPendingCoords] = useState<{x: number, y: number} | null>(null);
  const [errorMarker, setErrorMarker] = useState<{ x: number, y: number } | null>(null);

  //#region Autenticação
  // Session
  const [session, setSession] = useState<any>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  useEffect(() => {
    // 1. Pega a sessão atual ao carregar a página
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      // 3. Caso a sessão exista, ele irá dar refresh, então pularemos splash e apresentação
      if(session) {
        setIsLoading(false);
        setShowIntro(false);
      }
    };

    initializeAuth();

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(session);
      console.log(user);
      setSession(session);
    });

    // 2. Escuta mudanças na autenticação (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });

    if (error) console.error("Erro ao logar:", error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsDashboardOpen(false);
  };
  //#endregion


  //#region Calculos do backend aqui para visualização

  const calculateFrontendPrice = (x: number, y: number, type: string) => {
    // Lógica da Posição (Espelhando o SQL)
    const isInCenter = 
      x >= CENTER_LIMITS.x[0] && 
      x <= CENTER_LIMITS.x[1] &&
      y >= CENTER_LIMITS.y[0] && 
      y <= CENTER_LIMITS.y[1];

    const basePrice = isInCenter ? PRICES.AREA.center : PRICES.AREA.periphery;
    const typePrice = PRICES.TYPE[type as keyof typeof PRICES.TYPE] || 0;

    return basePrice + typePrice;
  };

  //#endregion


  //#region Captura dos Astros via DB
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      // 1. Verifica se temos um usuário logado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 2. Busca o saldo na tabela 'profiles'
        const { data, error } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Erro ao carregar créditos:", error.message);
        } else if (data) {
          setUser({
            ...user,
            balance: data.credits
          });
        }
      }
    };

    fetchUserProfile();

    // 3. Opcional: Escutar mudanças no Auth (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile();
      } else {
        setUser({ id: 'u1', name: 'Explorador', balance: 0 });
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
          console.log("Saldo atualizado via Realtime:", payload.new.credits);
          setUser((prevUser) => ({
            ...prevUser,
            balance: payload.new.credits,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [session?.user.id]);

  // Modifique o seu useEffect de carregamento
  useEffect(() => {

    const fetchAstros = async () => {
      const { data, error } = await supabase
        .from('astros')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Erro ao carregar os astros:", error);
      } else {
        setAstros(data || []);
      }
    };

    // Carrega os astros independente de estar logado ou não
    fetchAstros();

    // 2. Escuta em Tempo Real (Realtime)
    // Criamos um canal que "ouve" qualquer INSERT na tabela 'astros'
    const channel = supabase
      .channel('mapa_total')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'astros' }, // O '*' captura tudo
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          
          console.log("Payload: " + payload);
          // setUser((prevUser) => {
          //   if (payload.new.user_id === prevUser.id) {
          //     return { ...prevUser, balance: payload.new.balance };
          //   }
          //   return prevUser;
          // });

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
            if (novoAstro.user_id !== session?.user.id) {
                toast.custom((t) => (
                  <div className="flex flex-col gap-3 p-1">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full animate-pulse" 
                      style={{ backgroundColor: novoAstro.color, boxShadow: `0 0 10px ${novoAstro.color}` }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Novo astro descoberto</span>
                      <span className="text-xs text-slate-200">
                        {novoAstro.user_name} registrou uma mensagem no cosmos.
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      targetOff.current = { x: -(novoAstro.x * currentZoom.current) + window.innerWidth/2, y: -(novoAstro.y * currentZoom.current) + window.innerHeight/2 };
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
            setAstros((prev) => 
              prev.map((astro) => (astro.id === newRow.id ? (newRow as Astro) : astro))
            );
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
  }, []);

  //#endregion

  const getStarRegion = (x: number, y: number): AstroPosition => {
    if (y < 700) {
      return AstroPosition.ZENITH;
    } else if (y > 2400) {
      return AstroPosition.NADIR;
    } else {
      if (x < 1300) {
        return AstroPosition.HORIZON_LEFT;
      } else if (x > 2700) {
        return AstroPosition.HORIZON_RIGHT;
      } else {
        return AstroPosition.HORIZON;
      }
    }
  };

  const handleMapClick = (clientX: number, clientY: number) => {
      if (isPurchaseModalOpen || selectedAstro || modalAberto) return;
      if(Math.abs(velocity.current.x) < 0.5 && Math.abs(velocity.current.y) < 0.5)
      {
        // Converte pixel da tela para coordenada real do Canvas
        const canvasX = (clientX - offset.x) / zoom;
        const canvasY = (clientY - offset.y) / zoom;

        let zona = null;

        // Verificamos primeiro as extremidades verticais (Zênite e Nadir)
        zona = getStarRegion(canvasX, canvasY);

        // 3. Output no Console
        console.log(`📍 Clique detectado!`);
        console.log(`Coordenadas: X: ${Math.round(canvasX)} | Y: ${Math.round(canvasY)}`);
        console.log(`Zona Identificada: ${zona}`);
        console.log('---------------------------');

        // Ativa o marcador visual
        setClickMarker({ x: canvasX, y: canvasY });

        // Remove o brilho após 2 segundos para não poluir a tela
        setTimeout(() => setClickMarker(null), 2000);

        // Aqui você pode decidir se abre o modal de compra automaticamente
        // setIsPurchaseModalOpen(true); 
        // Verifica se não está clicando em um astro existente
        const isTooClose = astros.some(a => Math.hypot(a.x - canvasX, a.y - canvasY) < MIN_ASTRO_DISTANCE);
        // console.log("Perto demais?", isTooClose);

        if (isTooClose) {
          // Feedback de erro
          setErrorMarker({ x: canvasX, y: canvasY });
          
          // Remove o badge após 1.5 segundos
          setTimeout(() => setErrorMarker(null), 1500);
          return; // Interrompe a função aqui
        } else {
          setPendingCoords({ x: canvasX, y: canvasY });
          
          const zonaCalculada = getStarRegion(canvasX, canvasY);
          setPos(zonaCalculada); // Isso atualiza o estado 'pos' para o preço ficar correto no modal

          setIsPurchaseModalOpen(true);
        }
      }
  };

  const handleEnd = (clientX: number, clientY: number) => {
    setIsDragging(false);
    pinchDist.current = null;

    // Calcula a distância entre onde começou e onde terminou
    const distMoved = Math.hypot(
      clientX - touchStartPos.current.x,
      clientY - touchStartPos.current.y
    );

    // Se moveu menos de 10 pixels, consideramos um "Clique Puro"
    // 10px é uma margem de erro comum para dedos humanos (micro-tremores)
    if (distMoved < 10) {
      handleMapClick(clientX, clientY);
    }
  };

  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  
  // Navigation State
  // const [offset, setOffset] = useState({ x: -(SKY_W/2 - window.innerWidth/2), y: -(SKY_H/2 - window.innerHeight/2) });
  const [offset, setOffset] = useState({ x: -(SKY_W/4 + (window.innerWidth/2)), y: -(SKY_H/4 - (window.innerHeight/2)) });
  const [zoom, setZoom] = useState(0.7);
  
  const targetOff = useRef({ ...offset });
  const currentOff = useRef({ ...offset });
  const targetZoom = useRef(0.7);
  const currentZoom = useRef(0.7);
  const velocity = useRef({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const pinchDist = useRef<number | null>(null);

  // Form State
  const [msg, setMsg] = useState('');
  const [pos, setPos] = useState<AstroPosition>(AstroPosition.ZENITH);
  const [type, setType] = useState<AstroType>('star');
  const [color, setColor] = useState(ASTRO_COLORS[0]);

  // Initial Loading Progress
  useEffect(() => {
    // 1. Simulação de carregamento de 3 segundos
    const duration = 3000;
    const intervalTime = 100;
    const increment = 100 / (duration / intervalTime);
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    // 2. Carregamento Real (Simulado aqui, mas você pode buscar do seu banco)
    const loadData = async () => {
      try {
        // await fetchAstros(); 
        // Aqui você carregaria os dados do seu banco
        setTimeout(() => {
          setIsLoading(false);
          // setShowIntro(true); // Após carregar, mostra o pedido de Fullscreen
        }, duration + 500);
      } catch (error) {
        console.error("Erro ao carregar dados", error);
      }
    };

    loadData();
    return () => clearInterval(timer);
  }, []);

  // Modal intro for full screen request
  const handleEnableFullScreen = () => {
    const element = document.documentElement;

    setTimeout(() => {
      setShowIntro(false);
    }, 1500);

    if (element.requestFullscreen) {
      element.requestFullscreen().catch(err => console.log(err));
    } else if ((element as any).webkitRequestFullscreen) { // iOS Safari
      (element as any).webkitRequestFullscreen();
    }
  }
  
  // Main Loop for Smooth Transitions
  const animate = useCallback(() => {
    // if (!isDragging) {
      velocity.current.x *= FRICTION;
      velocity.current.y *= FRICTION;
      targetOff.current.x += velocity.current.x;
      targetOff.current.y += velocity.current.y;
    // }

    currentZoom.current += (targetZoom.current - currentZoom.current) * LERP;
    const sW = SKY_W * currentZoom.current;
    const sH = SKY_H * currentZoom.current;

    // Boundary constraints
    if (sW <= window.innerWidth) targetOff.current.x = (window.innerWidth - sW) / 2;
    else targetOff.current.x = Math.min(0, Math.max(window.innerWidth - sW, targetOff.current.x));

    if (sH <= window.innerHeight) targetOff.current.y = (window.innerHeight - sH) / 2;
    else targetOff.current.y = Math.min(0, Math.max(window.innerHeight - sH, targetOff.current.y));

    currentOff.current.x += (targetOff.current.x - currentOff.current.x) * LERP;
    currentOff.current.y += (targetOff.current.y - currentOff.current.y) * LERP;

    setOffset({ x: currentOff.current.x, y: currentOff.current.y });
    setZoom(currentZoom.current);
    // requestAnimationFrame(animate);
  }, [isDragging]);

  useEffect(() => {
    let frameId: number;

    const loop = () => {
      animate();
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId); // Isso mata o loop antigo antes de criar um novo
  }, [animate]);

  const handleZoom = (delta: number, cx: number, cy: number) => {
    const prevZ = targetZoom.current;
    const newZ = Math.min(MAX_Z, Math.max(MIN_Z, prevZ + delta));
    const ratio = newZ / prevZ;
    targetOff.current.x = cx - (cx - targetOff.current.x) * ratio;
    targetOff.current.y = cy - (cy - targetOff.current.y) * ratio;
    targetZoom.current = newZ;
  };

  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(-e.deltaY * 0.001, e.clientX, e.clientY);
    };
    window.addEventListener('wheel', wheel, { passive: false });
    return () => window.removeEventListener('wheel', wheel);
  }, []);

  const onStart = (cx: number, cy: number, target: HTMLElement) => {
    if (target.closest('.clickable') || target.closest('button')) return;
    setIsDragging(true);
    velocity.current = { x: 0, y: 0 };
    lastMousePos.current = { x: cx, y: cy };

    // Salva o ponto inicial para comparação no final
    touchStartPos.current = { x: cx, y: cy };
  };

  const onMove = (cx: number, cy: number) => {
    if (!isDragging) return;
    const delta = { x: cx - lastMousePos.current.x, y: cy - lastMousePos.current.y };
    velocity.current = { x: delta.x * 0.1 + velocity.current.x * 0.9, y: delta.y * 0.1 + velocity.current.y * 0.9 };
    lastMousePos.current = { x: cx, y: cy };
    targetOff.current.x += (velocity.current.x * 0.8) * DRAG_SENSITIVITY;
    targetOff.current.y += (velocity.current.y * 0.8) * DRAG_SENSITIVITY;
  };

  const onTouch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinchDist.current) handleZoom((dist - pinchDist.current) * 0.005, (e.touches[0].clientX + e.touches[1].clientX)/2, (e.touches[0].clientY + e.touches[1].clientY)/2);
      pinchDist.current = dist;
    } else if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const generateFictionalCoordinate = () => {
    const h = Math.floor(Math.random() * 24);
    const m = Math.floor(Math.random() * 60);
    const d = Math.floor(Math.random() * 180 - 90);
    return `RA ${h}h ${m}m / DEC ${d > 0 ? '+' : ''}${d}°`;
  };

  const handlePurchase = async () => {
    if (!session?.user) return toast.error("Precisas de estar logado!");
    
    // Iniciamos um estado de loading no botão para evitar cliques duplos
    // setIsLoading(true);

    try {
      // Chamamos a função RPC do Supabase
      // Nota: enviamos apenas o essencial. O banco decide o resto.
      const { data, error } = await supabase.rpc('purchase_astro', {
        p_user_id: session.user.id,
        p_message: msg, // O que o usuário escreveu no modal
        p_x: Math.round(pendingCoords.x), // Coordenada capturada no clique
        p_y: Math.round(pendingCoords.y),
        p_type: type,    // 'star', 'planet' ou 'nebula'
        p_color: color   // Hexadecimal selecionado
      });

      // Se o banco retornar erro (Saldo insuficiente, Muito próximo, etc)
      if (error) {
        throw new Error(error.message);
      }

      // SUCESSO! 
      // O 'data' já contém o astro completo gerado pelo banco (incluindo o size e o ID)
      const novoAstro = data;

      // 1. Atualizamos o estado local de astros (para o criador ver na hora)
      setAstros(prev => {
        // Verifica se o astro já não foi adicionado pelo WebSocket
        const existe = prev.some(a => a.id === novoAstro.id);
        if (existe) return prev;
        return [...prev, novoAstro];
      });

      // 2. Opcional: Atualizar o saldo de créditos na UI local se tiveres esse estado
      // setUserProfile(prev => ({ ...prev, credits: prev.credits - data.valor_pago }));
      setUser(prev => ({ ...prev, balance: prev.balance - data.valor_pago }));

      toast.success("O cosmos acolhe a tua nova criação!");
      
      // 3. Fechar o modal e limpar os inputs
      setIsPurchaseModalOpen(false);
      // setMessageInput("");

    } catch (err: any) {
      // Aqui capturamos o "Coordenadas muito próximas" ou "Saldo insuficiente" do SQL
      toast.error(err.message || "Erro na comunicação estelar.");
    } finally {
      // setIsLoading(false);
    }
    // const total = POSITION_PRICES[pos] + TYPE_PRICES[type];
    // if (user.balance < total) return alert('Créditos estelares insuficientes!');

    // // Safety Distance Enforcement (Collision)
    // let x = 0, y = 0, attempts = 0;
    // let safe = false;
    // const MAX_ATTEMPTS = 50; // Limite de tentativas para encontrar uma posição segura

    // while (attempts < MAX_ATTEMPTS) {
    //   switch (pos) {
    //     case AstroPosition.ZENITH: x = 1200 + Math.random() * 600; y = 700 + Math.random() * 600; break;
    //     case AstroPosition.HORIZON_LEFT: x = 200 + Math.random() * 600; y = 800 + Math.random() * 800; break;
    //     case AstroPosition.HORIZON_RIGHT: x = 2200 + Math.random() * 600; y = 800 + Math.random() * 800; break;
    //     case AstroPosition.HORIZON: x = 500 + Math.random() * 2000; y = 150 + Math.random() * 300; break;
    //     case AstroPosition.NADIR: x = 500 + Math.random() * 2000; y = 1600 + Math.random() * 300; break;
    //   }

    //   // Verifica se a nova posição está muito próxima de algum astro existente
    //   const isTooClose = astros.some(a => Math.hypot(a.x - x, a.y - y) < MIN_ASTRO_DISTANCE);
    //   if (!isTooClose) {
    //     safe = true;
    //     break;
    //   }
    //   attempts++;
    // }

    // if (!safe) {
    //   return alert('Esta região está muito congestionada. Tente outra posição ou aguarde por um espaço.');
    // }

    // x = pendingCoords.x;
    // y = pendingCoords.y;

    // const newAstro: Astro = {
    //   id: Math.random().toString(36).substr(2, 9),
    //   user_id: user.id, user_name: user.name,
    //   message: msg || "Um brilho na eternidade...",
    //   position: pos, type, color,
    //   size: type === 'nebula' ? 50 : type === 'planet' ? 24 : 12,
    //   x, y, coordinate: generateFictionalCoordinate(), created_at: Date.now()
    // };
    
    // setAstros(prev => [...prev, newAstro]);
    // setUser(prev => ({ ...prev, balance: prev.balance - total }));
    // setIsPurchaseModalOpen(false);
    // // Focus view on new astro
    // targetOff.current = { x: -(x * currentZoom.current) + window.innerWidth/2, y: -(y * currentZoom.current) + window.innerHeight/2 };
    // setIsDashboardOpen(false);
  };

  const renderConstellationLines = () => {
  const lines: React.ReactNode[] = [];
  const MAX_CONSTELLATION_DIST = 350; // Distância máxima para formar uma linha

  for (let i = 0; i < astros.length; i++) {
    for (let j = i + 1; j < astros.length; j++) {
      const a = astros[i];
      const b = astros[j];
      
      const dist = Math.hypot(a.x - b.x, a.y - b.y);

      if (dist < MAX_CONSTELLATION_DIST) {
        // Calculamos a opacidade baseada na distância (mais perto = mais forte)
        const opacity = 1 - (dist / MAX_CONSTELLATION_DIST);
        
        lines.push(
          <line
            key={`line-${a.id}-${b.id}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="white"
            strokeWidth="0.5"
            strokeOpacity={opacity * 0.5} // Linha bem sutil
            style={{ pointerEvents: 'none' }}
          />
        );
      }
    }
  }
  return lines;
};



  return (
    <>
      {/* Ordem de Camadas: Splash -> Modal Fullscreen -> App */}
      {isLoading && <SplashScreen progress={progress} onComplete={() => setShowIntro(true)} />}
      
      {!session && showIntro && <FullscreenPrompt onEnter={handleEnableFullScreen} />}

      {!isLoading && !showIntro && <FullscreenMonitor />}

      {isDashboardOpen && <UserDashboard
        user={session?.user}
        credits={user.balance}
        myAstros={astros}
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        onAbout={() => { setIsDashboardOpen(false);setIsModalSobreOpen(true); setModalAberto(true); }}
        onFocusAstro={(astro_x, astro_y) => {
          targetOff.current = { x: -(astro_x * currentZoom.current) + window.innerWidth/2, y: -(astro_y * currentZoom.current) + window.innerHeight/2 };
          setIsDashboardOpen(false);
        }}
        onLogout={handleLogout} />
      }

      {!showIntro && !isLoading && (
        <>
          {/* Configuração visual para combinar com o céu escuro */}
          <Toaster 
            theme="dark" 
            position="bottom-right" 
            toastOptions={{
              style: { 
                background: 'rgba(15, 23, 42, 0.8)', 
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#fff',
              },
            }} 
          />

          <div className="animate-entrance relative w-dvw h-dvh sky-gradient-v2 overflow-hidden select-none"
            onMouseDown={e => onStart(e.clientX, e.clientY, e.target as HTMLElement)}
            onMouseMove={e => onMove(e.clientX, e.clientY)}
            onMouseUp={(e) => {
              setIsDragging(false);
              pinchDist.current = null;
              const target = e.target as HTMLElement;
              if (!target.closest('.modal-content') && !target.closest('button')) {
                handleEnd(e.clientX, e.clientY);
              }
            }}
            onTouchStart={e => onStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement)}
            onTouchMove={onTouch}
            onTouchEnd={(e) => {
              setIsDragging(false);
              pinchDist.current = null;
              const touch = e.changedTouches[0];
              const target = e.target as HTMLElement;
              
              if (!target.closest('.modal-content') && !target.closest('button')) {
                handleEnd(touch.clientX, touch.clientY);
              }
            }}>
            
            <div className="absolute sky-canvas star-overlay" style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`, width: SKY_W, height: SKY_H }}>
              <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none" 
                  viewBox={`0 0 ${SKY_W} ${SKY_H}`}
                >
                  {renderConstellationLines()}
                </svg>
              {/* Badge de Erro (Too Close) */}
              {errorMarker && (
                <div 
                  className="absolute pointer-events-none z-50 flex flex-col items-center gap-2"
                  style={{ 
                    left: errorMarker.x, 
                    top: errorMarker.y,
                    transform: 'translate(-50%, -50%)' 
                  }}
                >
                  {/* Círculo de pulso vermelho */}
                  <div className="w-12 h-12 rounded-full border-2 border-red-500 animate-ping absolute" />
                  
                  {/* Ícone e Texto */}
                  <div className="bg-red-600/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-400 shadow-xl flex items-center gap-2 animate-bounce">
                    <i className="fa-solid fa-circle-exclamation text-white text-xs"></i>
                    <span className="text-white font-black text-[9px] uppercase tracking-tighter whitespace-nowrap">
                      Espaço Ocupado
                    </span>
                  </div>
                </div>
              )}

              {/* Efeito de Blink ao clicar */}
              {clickMarker && (
                <div 
                  className="absolute pointer-events-none z-50"
                  style={{ 
                    left: clickMarker.x, 
                    top: clickMarker.y,
                    transform: 'translate(-50%, -50%)' 
                  }}
                >
                  {/* Círculo expansivo (Blink) */}
                  <div className="w-20 h-20 rounded-full border-2 border-yellow-400/50 animate-ping" />
                  {/* Ponto central */}
                  <div className="absolute inset-0 m-auto w-2 h-2 bg-white rounded-full shadow-[0_0_15px_white]" />
                </div>
              )}
              {/* Geographic Badges Inside Canvas */}
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 opacity-50 pointer-events-none">
                <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">Horizonte</span>
              </div>
              <div className="absolute top-[8%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">Zênite</span>
              </div>
              <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 opacity-50 pointer-events-none">
                <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">Nadir</span>
              </div>
              <div className="absolute top-1/2 left-[5%] -translate-y-1/2 -rotate-90 opacity-50 pointer-events-none">
                <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">Horizonte Leste</span>
              </div>
              <div className="absolute top-1/2 right-[5%] -translate-y-1/2 rotate-90 opacity-50 pointer-events-none">
                <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">Horizonte Oeste</span>
              </div>

              {astros.map(a => <AstroItem key={a.id} astro={a} onClick={setSelectedAstro} />)}
            </div>

            
            {/* Interface Overlay */}
            <div className="absolute top-6 left-6 pointer-events-none z-10">
              <h1 className="text-2xl font-black text-white tracking-tighter drop-shadow-2xl">CÉU<span className="text-yellow-400 italic">NOTURNO</span></h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">VERSÃO 0.1b • Zoom {Math.round(zoom*100)}%</p>
            </div>

            {/* <div className="absolute top-6 right-6 z-10 bg-slate-900/40 border border-white/10 backdrop-blur-xl p-2 pr-5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">{user.name[0]}</div>
              <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold uppercase">Saldo</span><span className="text-sm text-yellow-400 font-black">★ {user.balance}</span></div>
            </div> */}
            {/* <div className="absolute top-6 right-6 z-10 bg-slate-900/40 border animate-pulse border-white/10 backdrop-blur-xl p-2 pr-5 rounded-2xl flex items-center gap-3">
              <button onClick={() => setModalAberto(true) } className="text-white pointer-events-auto font-black px-3 py-1 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs tracking-[0.2em] flex items-center gap-3 mx-auto">
                <i className="fa-solid fa-question text-lg"></i> SOBRE
              </button>
            </div> */}
            {/* No local onde ficava o botão SOBRE */}
            {!session ? (
              <div className="absolute top-6 right-6 z-10 bg-slate-900/40 border animate-pulse border-white/10 backdrop-blur-xl p-2 pr-5 rounded-2xl flex items-center gap-3">
                <button onClick={handleLogin} className="text-white pointer-events-auto font-black px-3 py-1 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs tracking-[0.2em] flex items-center gap-3 mx-auto">
                  <i className="fa-solid fa-user text-lg"></i> ACESSAR
                </button>
              </div>
            ) : (
              <div className="absolute top-6 right-6 z-10 p-2 pr-5 rounded-2xl flex items-center gap-3">
                {/* SALDO DE CRÉDITOS (Ainda vindo do estado local por enquanto) */}
                <div className="bg-slate-900/60 border border-white/10 px-3 py-2 rounded-xl">
                  <span className="text-yellow-400 font-black text-xs">★ {user.balance}</span>
                </div>

                {/* AVATAR DO GOOGLE */}
                <button onClick={() => setIsDashboardOpen(true)} className="group relative">
                  <img 
                    src={session.user.user_metadata.avatar_url} 
                    alt="Perfil" 
                    className="w-10 h-10 rounded-xl border-2 border-indigo-500 shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                </button>
              </div>
            )}

            <div className="absolute bottom-11 left-1/2 -translate-x-1/2 text-center z-10 w-full px-6 pointer-events-none">
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mb-4 animate-pulse">Toque em um astro e descubra sua mensagem</p>
            </div>
            {/* <div className="absolute bottom-11 left-1/2 -translate-x-1/2 text-center z-10 w-full px-6 pointer-events-none">
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mb-4 animate-pulse">Clique em uma estrela para ver a mensagem</p>
              <button onClick={() => setIsPurchaseModalOpen(true)} className="animate-pulse pointer-events-auto bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-6 py-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs tracking-[0.2em] flex items-center gap-3 mx-auto">
                <i className="fa-solid fa-star text-lg"></i> REIVINDICAR SEU ASTRO
              </button>
            </div> */}

            {/* Minimap for Navigation */}
            <div className="fixed bottom-6 right-6 w-36 h-24 bg-black/60 border border-white/10 rounded-xl backdrop-blur-md overflow-hidden z-20 pointer-events-none shadow-2xl">
              <div className="absolute bg-white/20 border border-white/40 rounded-sm" style={{ 
                  width: `${(window.innerWidth/(SKY_W*zoom))*100}%`, height: `${(window.innerHeight/(SKY_H*zoom))*100}%`,
                  left: `${(-offset.x/(SKY_W*zoom))*100}%`, top: `${(-offset.y/(SKY_H*zoom))*100}%` 
              }} />
            </div>

            {/* Multimodal Purchase Modal */}
            <Modal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} title="Nova Reivindicação">
              <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-slate-800 rounded-2xl border border-white/5">
                  {(['star', 'planet', 'nebula'] as AstroType[]).map(t => (
                    <button key={t} onClick={() => setType(t)} className={`flex-1 py-4 rounded-xl flex flex-col items-center gap-1 transition-all ${type === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                      <i className={`fa-solid ${t === 'star' ? 'fa-star' : t === 'planet' ? 'fa-earth-americas' : 'fa-cloud-sun'}`}></i>
                      <span className="text-[9px] font-black uppercase">{t}</span>
                      <span className="text-[8px] opacity-70">★{TYPE_PRICES[t]}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-black uppercase mb-2">Mensagem Eterna</label>
                  <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="O que você deseja transmitir ao firmamento?" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm h-24 focus:ring-1 focus:ring-indigo-500 outline-none resize-none" />
                </div>
                { pendingCoords && (   
                  <>             
                <div className="grid grid-cols-2 gap-2">
                  {/* Exibir a coordenada selecionada usando o pendingCoords e informando qual região estelar ela pertence */}
                  <div className="p-4 bg-slate-800 rounded-xl border border-white/5 text-center">
                    <p className="text-slate-500 text-[10px] font-black uppercase mb-2">Coordenada</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-white text-sm font-black">
                        {pendingCoords?.x.toFixed(2)} : {pendingCoords?.y.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-xl border border-white/5 text-center">
                    <p className="text-slate-500 text-[10px] font-black uppercase mb-2">Região Estelar</p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-white text-sm font-black">{getStarRegion(pendingCoords?.x, pendingCoords?.y)}</p>
                    </div>
                  </div>
                  
                </div>

                {/* MINIMAPA DE LOCALIZAÇÃO */}
                
                  <div className="relative w-full h-32 bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                    {/* Background sutil para parecer o céu */}
                    <div className="absolute inset-0 opacity-20 sky-gradient-v2" />
                    
                    {/* Linhas de grade (opcional, para guiar o olho) */}
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-10">
                      {[...Array(16)].map((_, i) => <div key={i} className="border-[0.5px] border-white" />)}
                    </div>

                    {/* O Ponto do Astro no Minimapa */}
                    <div 
                      className="absolute w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_#facc15] animate-pulse"
                      style={{ 
                        left: `${(pendingCoords.x / SKY_W) * 100}%`, 
                        top: `${(pendingCoords.y / SKY_H) * 100}%`,
                        transform: 'translate(-50%, -50%)'
                      }} 
                    />
                    
                    {/* Label indicando que é um preview */}
                    <div className="absolute bottom-2 right-2">
                      <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Localização no Firmamento</span>
                    </div>
                  </div>
                  </>
                )}

                <div className="grid grid-cols-5 gap-3">
                  {ASTRO_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`h-8 rounded-lg transition-all ${color === c ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-40 hover:opacity-100'}`} style={{backgroundColor: c}} />)}
                </div>
                {user.balance >= calculateFrontendPrice(pendingCoords?.x, pendingCoords?.y, type) && (
                  <button onClick={handlePurchase} className="w-full bg-yellow-400 text-slate-950 font-black py-4 rounded-xl shadow-xl transition-all uppercase tracking-widest text-xs">Confirmar Reivindicação (★ {calculateFrontendPrice(pendingCoords?.x, pendingCoords?.y, type)})</button>
                )}
                
                {user.balance < calculateFrontendPrice(pendingCoords?.x, pendingCoords?.y, type) && (
                  <p className="text-center w-full bg-yellow-400 bg-opacity-50 text-slate-950 font-black py-4 rounded-xl shadow-xl transition-all uppercase tracking-widest text-xs">Saldo insuficiente (★ {calculateFrontendPrice(pendingCoords?.x, pendingCoords?.y, type)})</p>
                )}
              </div>
            </Modal>

            {/* Astro Details Modal */}
            <Modal isOpen={!!selectedAstro} onClose={() => setSelectedAstro(null)}>
              <div className="animate-entrance backdrop-blur-sm text-center py-6">
                <div className="w-24 h-24 mx-auto mb-8 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full blur-3xl opacity-30" style={{backgroundColor: selectedAstro?.color}} />
                  <div className={`w-14 h-14 rounded-full relative z-10 flex items-center justify-center modal-star-anim shadow-2xl`} style={{backgroundColor: selectedAstro?.color, boxShadow: `0 0 50px ${selectedAstro?.color}aa`}}>
                      <div className="absolute inset-0 rounded-full bg-white/30 blur-[2px]" />
                  </div>
                </div>
                <p className="text-2xl text-white font-serif italic leading-relaxed px-4">"{selectedAstro?.message}"</p>
                <div className="mt-8 pt-6 border-t border-white/5 space-y-1">
                  <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-[0.2em]">{selectedAstro?.coordinate}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Observado por {selectedAstro?.user_name}</p>
                </div>
              </div>
            </Modal>

            {/* O MODAL */}
          <ModalSobre 
            isOpen={modalAberto} 
            onClose={() => setModalAberto(false)} 
          />
          </div>
        </>
      )}
    </>
  );
};

export default App;