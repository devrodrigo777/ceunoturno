import React, { useState, useEffect, useRef, useMemo } from "react";
import { Astro, AstroPosition, User, AstroType } from "./types";
import { SKY_W, SKY_H, MIN_ASTRO_DISTANCE, FRICTION, LERP, MIN_Z, MAX_Z, DRAG_SENSITIVITY, INITIAL_ASTROS } from "./constants";
import FullscreenPrompt from "./components/FullScreenPrompt";
import SplashScreen from "./components/SplashScreen";
import { supabase } from "./services/supabaseClient";
import FullscreenMonitor from "./components/FullScreenMonitor";
import UserDashboard from "./components/UserDashboard";
import { Toaster, toast } from "sonner";
import { useSession } from "./hooks/useSession";
import { useUserCreditsRealtime } from "./hooks/useUserCreditsRealtime";
import { useAstrosRealtime } from "./hooks/useAstrosRealtime";
import { useSkyViewport } from "./hooks/useSkyViewport";
import { useWindowSize } from "./hooks/useWindowSize";
import { usePurchaseFlow } from "./hooks/usePurchaseFlow";
import SkyViewport from "./components/SkyViewport";
import { useBackHandler } from "./hooks/useBackHandler";
import { useShareOrCopy } from "./hooks/useShareOrCopy";

const App: React.FC = () => {
  const [astros, setAstros] = useState<Astro[]>(INITIAL_ASTROS);
  const [user, setUser] = useState<User>({
    id: "0",
    name: "Explorador Desconhecido",
    balance: 0,
  });

  const [selectedAstroId, setSelectedAstroId] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const [showIntro, setShowIntro] = useState(false);

  // Modal Sobre State
  const [isModalSobreOpen, setIsModalSobreOpen] = useState(false);
  // Modal Termos State
  const [isModalTermosOpen, setIsModalTermosOpen] = useState(false);
  // Modal Sobre State
  const [modalAberto, setModalAberto] = useState(false);

  // Click position marker
  const [clickMarker, setClickMarker] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [errorMarker, setErrorMarker] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Form State
  const { width, height } = useWindowSize();
  // texto da descoberta
  // título da descoberta
  const [pos, setPos] = useState<AstroPosition>(AstroPosition.ZENITH);

  // Fotos

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const [isPulsing, setIsPulsing] = useState(false);
  const [pulseFx, setPulseFx] = useState<Record<string, number>>({});

  const viewedAstrosRef = useRef<Set<string>>(new Set());
  const pendingAstroIdRef = useRef<string | null>(null);
  const handledAstroIdRef = useRef<string | null>(null);

  //#region Autenticação

  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const selectedAstro = selectedAstroId
    ? (astros.find((a) => a.id === selectedAstroId) ?? null)
    : null;

  const isMapBlocked =
  isPurchaseModalOpen ||
  isPreviewOpen ||
  !!selectedAstro ||
  isModalSobreOpen ||
  modalAberto ||
  isModalTermosOpen ||
  isDashboardOpen;


  const {
    offset, zoom, isDragging, targetOff, currentZoom, onStart, onMove,
    onTouch, stopDragging, getTouchStart, getVelocity, setDragging,
  } = useSkyViewport({
    skyW: SKY_W, skyH: SKY_H, initialZoom: 0.7, friction: FRICTION,
    lerp: LERP, minZ: MIN_Z, maxZ: MAX_Z, dragSensitivity: DRAG_SENSITIVITY,
    isBlocked: isMapBlocked,
    isBlockedTarget: (target) =>
    !!target.closest(".clickable") || !!target.closest("button"),
  });

  const openAstroDetails = (astroId: string) => {
    setSelectedAstroId(astroId);

    const url = new URL(window.location.href);
    url.searchParams.set("astro", astroId);

    history.pushState({ ui: "astro", astroId }, "", url.toString());
  };


  /**
   * Referência para o ID do usuário da sessão atual
   */
  const sessionUserIdRef = useRef<string | null>(null);
  const { session } = useSession({ setIsLoading, setShowIntro });
  sessionUserIdRef.current = session?.user?.id ?? null;

  
  /**
   * Realtime hooks
   */
  useUserCreditsRealtime({ session, setUser });
  useAstrosRealtime({
    setAstros,
    setPulseFx,
    toast,
    sessionUserIdRef,
    targetOff,
    currentZoom,
  });

  

  

  useEffect(() => {
    if (isMapBlocked) stopDragging();
  }, [isMapBlocked, stopDragging]);


  const handlePulse = async () => {
    if (!session?.user) return toast.error("Precisas de estar logado!");
    if (!selectedAstro) return;


    setIsPulsing(true);
    
    try {
      const astroId = selectedAstro.id;
      
      // setTimeout(async () => {
      const { error } = await supabase.rpc("pulse_astro", {
        p_astro_id: astroId,
      });
      
      if (error)
        toast.error(error.message);
      else
        setSelectedAstroId(null);

      // não precisa setAstros: o realtime UPDATE já vai chegar e atualizar o mapa [file:1]
      // seu saldo também atualiza via realtime do profiles [file:1]
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsPulsing(false);
    }
  };

  const handleShare = async () => {
    if (!selectedAstro) return;

    const url = `${window.location.origin}?astro=${selectedAstro.id}`;

    const res = await useShareOrCopy(
      url,
      "Céu Noturno",
      "Veja esse astro que eu encontrei:"
    );

    if (res.ok && res.mode === "share") toast.success("Abrindo compartilhamento...");
    else if (res.ok && res.mode === "copy") toast.success("Link copiado!");
    else toast.error("Não foi possível compartilhar/copiar.");
  };

  // Helper para limpar imagens quando fecha o modal

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) console.error("Erro ao logar:", error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsDashboardOpen(false);
  };
  //#endregion

  //#region Captura dos Astros via DB

  // Ler astros vindos do GET
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const astroId = params.get("astro");
    if (!astroId) return;

    pendingAstroIdRef.current = astroId;

    // opcional: fecha UIs já na chegada via link
    setIsDashboardOpen(false);
    setModalAberto(false);
    setIsModalSobreOpen(false);
    setIsModalTermosOpen(false);

    // transforma esse link em "root" da sessão (não empilha)
    history.replaceState({ ui: "astro-root", astroId }, "", window.location.href);
  }, []);

  // Identificar, localiar e abrir o modal
  useEffect(() => {
    const astroId = pendingAstroIdRef.current;
    if (!astroId) return;

    // evita reabrir em re-render
    if (handledAstroIdRef.current === astroId) return;

    if (!astros.length) return;
    const astro = astros.find((a) => a.id === astroId);
    if (!astro) return; // pode escolher limpar a URL aqui se quiser

    // viewport (se width/height ainda estiverem 0, espera)
    if (!width || !height) return;

    targetOff.current = {
      x: -astro.x * currentZoom.current + width / 2,
      y: -astro.y * currentZoom.current + height / 2,
    };

    // aqui NÃO use pushState (porque veio do link); só abre o modal
    setSelectedAstroId(astro.id);

    handledAstroIdRef.current = astroId;
  }, [astros, width, height]);


  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   const astroId = params.get("astro");
  //   if (!astroId) return;
  //   if (!astros.length) return;
  //   console.log(astros);
  //   const astro = astros.find((a) => a.id === astroId);
  //   if (!astro) {  
  //     // fecha qualquer UI aberta
  //     setIsDashboardOpen(false);
  //     setModalAberto(false);
  //     setIsModalSobreOpen(false);
  //     setIsModalTermosOpen(false);

  //     // marca a entrada atual como "root" sem empilhar nada
  //     history.replaceState({ ui: "root" }, "", window.location.href);
  //   }

  //   // foca no astro (você já faz isso em outros pontos usando targetOff/currentZoom) [file:1]
  //   targetOff.current = {
  //     x: -astro.x * currentZoom.current + width / 2,
  //     y: -astro.y * currentZoom.current + height / 2,
  //   };

  //   openAstroDetails(astro.id); // abre modal [file:1]
  // }, [astros]);

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

  const {
    quote,
    msg,
    setMsg,
    titulo,
    setTitulo,
    pendingCoords,
    type,
    setType,
    color,
    setColor,
    imagePreviewUrl,
    previewAstro,
    handleMapClick,
    closePurchaseModal,
    handlePurchase,
    onPickImage,
    removeImage,
    minimapDotStyle,
  } = usePurchaseFlow({
    astros,
    offset,
    zoom,
    session,
    isPurchaseModalOpen,
    selectedAstro,
    modalAberto,
    setAstros,
    setPos,
    setClickMarker,
    setErrorMarker,
    setIsPurchaseModalOpen,
    SKY_W,
    SKY_H,
    MIN_ASTRO_DISTANCE,
    getStarRegion,
    getVelocity,
  });

  const handleEnd = (clientX: number, clientY: number) => {
    stopDragging();

    // Calcula a distância entre onde começou e onde terminou
    const start = getTouchStart();
    const distMoved = Math.hypot(clientX - start.x, clientY - start.y);

    // Se moveu menos de 10 pixels, consideramos um "Clique Puro"
    // 10px é uma margem de erro comum para dedos humanos (micro-tremores)
    if (distMoved < 10) {
      handleMapClick(clientX, clientY);
    }
  };

  const openDashboard = () => setIsDashboardOpen(true);
  const closeDashboard = () => setIsDashboardOpen(false);

  const openSobre = () => {
    setIsDashboardOpen(false);
    setModalAberto(true); // ou setIsModalSobreOpen(true)
    history.pushState({ ui: "sobre" }, "");
  };
  const closeSobre = () => {
    setModalAberto(false);
    setIsModalSobreOpen(false); // se existir
  };

  const openTermos = () => {
    setIsDashboardOpen(false);
    setIsModalTermosOpen(true);
    history.pushState({ ui: "termos" }, "");
  };
  const closeTermos = () => setIsModalTermosOpen(false);

  const { pushDashboard, pushSobre, pushTermos } = useBackHandler({
    isDashboardOpen,
    isModalSobreOpen,
    modalAberto,
    isModalTermosOpen,
    openDashboard,
    closeDashboard,
    openSobre,
    closeSobre,
    openTermos,
    closeTermos,
    closeAstroDetails: () => setSelectedAstroId(null),
    selectedAstroId
  });

  // Progresso inicial de carregamento
  useEffect(() => {
    // 1. Simulação de carregamento de 3 segundos
    const duration = session ? 1000 : 3000;;
    const intervalTime = 100;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
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

  // Abre o modal de pedido de Fullscreen
  const handleEnableFullScreen = (fullScreen : boolean = true) => {
    const element = document.documentElement;

    if(fullScreen){
      setTimeout(() => {
        setShowIntro(false);
      }, 1500);

      if (element.requestFullscreen) {
        element.requestFullscreen().catch((err) => console.log(err));
      } else if ((element as any).webkitRequestFullscreen) {
        // iOS Safari
        (element as any).webkitRequestFullscreen();
      } else {
        toast.error("Seu navegador não suporta Fullscreen.");
      }
    } else {
      setTimeout(() => {
        setShowIntro(false);
      }, 500);
    }
  };

  const openAstroModal = async (astro: Astro) => {
    
    openAstroDetails(astro.id);
  

    if (viewedAstrosRef.current.has(astro.id)) return;
    viewedAstrosRef.current.add(astro.id);

    try {
      await supabase.rpc("register_astro_view", { p_astro_id: astro.id });
    } catch {
      // silencioso: view é métrica, não pode travar UX
    }
  };

  const constellationLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const MAX_CONSTELLATION_DIST = 350; // Distância máxima para formar uma linha

    for (let i = 0; i < astros.length; i++) {
      for (let j = i + 1; j < astros.length; j++) {
        const a = astros[i];
        const b = astros[j];

        const dist = Math.hypot(a.x - b.x, a.y - b.y);

        if (dist < MAX_CONSTELLATION_DIST) {
          // Calculamos a opacidade baseada na distância (mais perto = mais forte)
          const opacity = 1 - dist / MAX_CONSTELLATION_DIST;

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
              style={{ pointerEvents: "none" }}
            />,
          );
        }
      }
    }
    return lines;
  }, [astros]);
  
  return (
    <>
      {/* Ordem de Camadas: Splash -> Modal Fullscreen -> App */}
      {isLoading && (
        <SplashScreen
          progress={progress}
          onComplete={() => { setShowIntro(true); setIsLoading(false); }}
        />
      )}

      {!session && showIntro && (
        <FullscreenPrompt onEnter={(e) => { console.log(e); handleEnableFullScreen(e); }} />
      )}

      {/* {!isLoading && !showIntro && <FullscreenMonitor />} */}

      {isDashboardOpen && (
        <UserDashboard
          user={session?.user}
          credits={user.balance}
          myAstros={astros}
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          onAbout={() => {
            setIsDashboardOpen(false);
            setIsModalSobreOpen(true);
            setModalAberto(true);
          }}
          onTerms={() => {
            setIsDashboardOpen(false);
            setIsModalTermosOpen(true);
            setModalAberto(false);
          }}
          onFocusAstro={(astro_x, astro_y) => {
            targetOff.current = {
              x: -(astro_x * currentZoom.current) + width / 2,
              y: -(astro_y * currentZoom.current) + height / 2,
            };
            setIsDashboardOpen(false);
          }}
          onLogout={handleLogout}
        />
      )}

      {!showIntro && !isLoading && (
        <>
          {/* Configuração visual para combinar com o céu escuro */}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgba(15, 23, 42, 0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                color: "#fff",
              },
            }}
          />

          <SkyViewport
            offset={offset}
            zoom={zoom}
            stopDragging={stopDragging}
            onStart={onStart}
            onMove={onMove}
            onTouch={onTouch}
            onEnd={handleEnd}
            SKY_W={SKY_W}
            SKY_H={SKY_H}
            constellationLines={constellationLines}
            astros={astros}
            pulseFx={pulseFx}
            clickMarker={clickMarker}
            errorMarker={errorMarker}
            onClearError={() => setErrorMarker(null)}
            onAstroClick={(astro) => {
              openAstroModal(astro);
              openAstroDetails(astro.id);
            }}
            titleZoomText={`VERSÃO 0.1b • Zoom ${Math.round(zoom * 100)}%`}
            session={session}
            userBalance={user.balance}
            onLogin={handleLogin}
            onOpenDashboard={() => pushDashboard()}
            width={width}
            height={height}
            isPurchaseModalOpen={isPurchaseModalOpen}
            closePurchaseModal={closePurchaseModal}
            quote={quote}
            type={type}
            setType={setType}
            msg={msg}
            setMsg={setMsg}
            pendingCoords={pendingCoords}
            color={color}
            setColor={setColor}
            imagePreviewUrl={imagePreviewUrl}
            onPickImage={onPickImage}
            removeImage={removeImage}
            onConfirmPurchase={handlePurchase}
            isPreviewOpen={isPreviewOpen}
            setIsPreviewOpen={setIsPreviewOpen}
            previewAstro={previewAstro}
            selectedAstro={selectedAstro}
            onCloseAstroDetails={() => {setSelectedAstroId(null); history.pushState({ ui: "root" }, "", window.location.pathname); }}
            onPulse={handlePulse}
            onShare={handleShare}
            isPulsing={isPulsing}
            modalAberto={modalAberto}
            closeModalSobre={() => {setModalAberto(false); pushDashboard(); }}
            isModalTermosOpen={isModalTermosOpen}
            closeModalTermos={() => {setIsModalTermosOpen(false); pushDashboard(); }}
            isMapBlocked={isMapBlocked}
          />
        </>
      )}
    </>
  );
};

export default App;
