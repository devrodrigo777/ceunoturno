import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import ModalSobre from "./components/ModalSobre";
import ModalTermos from "./components/ModalTermos";
import RechargeModal from "./components/RechargeModal";
import { __version__, enforceVersionReset } from "./utils/versionGuard";
import PosterModal from "./components/PosterModal";
import PosterConfirmModal from "./components/PosterConfirmModal";
import ReferralModal from "./components/ReferralModal";
import { useUserProfile } from "./hooks/useUserProfile";
import CometaTimer from "./components/CometaTimer";
import { CometaGameModal } from "./components/CometaGameModal";
import { useCometaRealtime } from "./hooks/useCometaRealtime";
import { error } from "console";

const App: React.FC = () => {
  enforceVersionReset();
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

  const [loginMarker, setLoginMarker] = useState<{
    x: number;
    y: number;
  } | null>(null);

  type ErrorCircle = { x: number; y: number; r: number } | null;
  const [errorCircle, setErrorCircle] = useState<ErrorCircle>(null);

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

  type OverlayKey = 'dashboard' | 'sobre' | 'termos' | 'purchase' | 'preview' | 'astro' | 'recharge'
    | 'poster' | 'posterConfirm' | 'referral' | 'cometa';

  const [overlayStack, setOverlayStack] = useState<OverlayKey[]>([]);
  const isMapBlocked = overlayStack.length > 0;
  const isOpen = (k:OverlayKey) => overlayStack.includes(k);



  const openOverlay = useCallback((k: OverlayKey, state: any = { ui: k }, url?: string) => {
    setOverlayStack(s => (s[s.length - 1] === k ? s : [...s, k]));
    history.pushState(state, '', url ?? window.location.pathname);
  }, []);

  const closeTopOverlay = () => {
    window.history.back();
  };

  const closeAllOverlays = () => {
    setOverlayStack([]);
  }



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
    openOverlay('astro', { ui:'astro', astroId }, url.toString());
  };


  /**
   * Referência para o ID do usuário da sessão atual
   */
  const sessionUserIdRef = useRef<string | null>(null);
  const { session } = useSession({ setIsLoading, setShowIntro });
  sessionUserIdRef.current = session?.user?.id ?? null;

  const { profile, loading } = useUserProfile();
  
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

  useEffect(() => {  console.log(overlayStack);
    if (isMapBlocked) stopDragging();
  }, [isMapBlocked, stopDragging]);

  // No useEffect após detectar login + localStorage ref
  useEffect(() => {
    if (session?.user) {
      const refId = localStorage.getItem('signup_ref')
      if (refId) {
        applyReferral(refId)
      }

      console.log(profile);
    }
  }, [session])

  const applyReferral = async (referrerId: string) => {    
    const { data, error } = await supabase.functions.invoke('apply_signup_referral', {
      body: { referrer_id: referrerId }
    })

    if (data?.success) {
      localStorage.removeItem('signup_ref')
    } else if (error) {
      console.error('Referral error:', error)
    }
  }

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
      else {
        closeTopOverlay();
        setSelectedAstroId(null);
        toast.success("Astro pulsado com sucesso!");
      }

      // não precisa setAstros: o realtime UPDATE já vai chegar e atualizar o mapa [file:1]
      // seu saldo também atualiza via realtime do profiles [file:1]
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsPulsing(false);
    }
  };

  const POSTER_PRICE = 1000;
useEffect(() => {
  const onPopState = () => {
    // console.log("POPSTATE!", overlayStack ); // ou só log
    setOverlayStack((s) => s.slice(0, -1));
  };
  window.addEventListener("popstate", onPopState);
  return () => window.removeEventListener("popstate", onPopState);
}, [setOverlayStack]);
  const handlePosterPurchase = async () => {
    if (!session?.user) return toast.error("Precisa estar logado!");
    if (!selectedAstro) return;

    try {
      const { data, error } = await supabase.rpc("purchase_poster", {
        pastroid: selectedAstro.id,
      });
      // fecha confirmação
      closeTopOverlay(); // fecha posterConfirm

      if (error) toast.error(error.message);
      if (!data) toast.error("Resposta vazia do procedimento.");

      toast.success("Pôster estelar ativado. Parabéns!");

      

      // abre o modal do pôster
      openOverlay("poster");
    } catch (e: any) {
      const msg = String(e?.message ?? e);

      if (msg.includes("insufficient_credits")) toast.error("Saldo insuficiente.");
      else if (msg.includes("forbidden")) toast.error("Você não é dono desse astro.");
      else toast.error(msg);
    } finally {
      console.log(overlayStack);
    }
  };

  const handlePoster = () => {
    if (!selectedAstro) return;

    // só dono vê o botão, mas mantém segurança aqui também
    if (selectedAstro.user_id !== session?.user?.id) {
      return toast.error("Somente o dono do astro pode gerar o pôster.");
    }

    if (selectedAstro.poster_enabled) {
      openOverlay("poster");
    } else {
      openOverlay("posterConfirm");
    }
  }

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

    const refParam = new URLSearchParams(window.location.search).get('ref')
    if (refParam) {
      localStorage.setItem('signup_ref', refParam)
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) console.error("Erro ao logar:", error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    closeTopOverlay();
    window.location.reload();
  };
  //#endregion

  //#region Captura dos Astros via DB

  // Ler astros vindos do GET
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const astroId = params.get("astro");
    if (!astroId) return;

    pendingAstroIdRef.current = astroId;

    closeAllOverlays();
    openOverlay("astro", { ui: "astro", astroId }, "?astro=" + astroId);
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

  const myAstros = useMemo(() => {
    const uid = session?.user?.id;
    if (!uid) return [];
    return astros.filter(a => a.user_id === uid);
  }, [astros, session?.user?.id]);

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
    starmapEnabled, setStarmapEnabled,
    starmapTitle, setStarmapTitle,
    locationQuery, setLocationQuery,
    locationResults,
    locationLoading,
    selectedLocation, setSelectedLocation,
    eventDate, setEventDate,
    eventTime, setEventTime,
    hideTime, setHideTime,
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
    setIsDashboardOpen,
    setErrorCircle,
    openOverlay,
    setLoginMarker,
    closeTopOverlay
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

  const openSobre = () => {
    openOverlay("sobre");
  };
  const closeSobre = () => {
    closeTopOverlay();
  };

  const openTermos = () => {
    openOverlay("termos");
  };
  // const closeTermos = () => closeTopOverlay();

  const { closeOverlay, pushDashboard, pushSobre, pushTermos } = useBackHandler({
    setOverlayStack,
    openOverlay,
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

  const closeAstroModal = () => {
    setSelectedAstroId(null);
    closeAllOverlays();
    const url = new URL(window.location.href);
    url.searchParams.delete("astro");
    window.history.replaceState(null, "", url.href);
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

  const { game, activeBet, cashout, hasCashout, cashoutAmount } = useCometaRealtime(profile);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0)
  const [betAmount, setBetAmount] = useState(0);

  const placeBet = async (amount: number) => {
    try {
      const res = await fetch(
        `https://fycadvyrbqaqdvspmrtg.supabase.co/functions/v1/place-bet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ amount }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      } else {
        if(data.success) {
          toast.success("Aposta realizada com sucesso!");
          setBetAmount(amount);
        }
      }

      

    } catch (error: any) {
      console.error(error)
      toast.error(error.message)
    }
  }

  const userBalance = useMemo(() => {
  const value = Number(user?.total_referral_commission)
  return isNaN(value) ? 0 : value
}, [user?.total_referral_commission])


  
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

          {/* Criaremos uma DIV para ficar no canto inferior esquerdo, com tamanho máximo de um botão grande */}
          {/* <div className="absolute bottom-5 left-5 max-w-[200px]"> */}
            {/* Saldo JOGO (Cometa) */}
            {/* <div className="font-black text-yellow-400">
              Poeiras Estelares: {profile?.total_referral_comission?.toFixed(0) ?? 0}
            </div> */}
            {/* Cometa Timer */}
            <CometaTimer 
              game={game}
              userBalance={userBalance} 
              onClick={() => openOverlay("cometa")} 
              setMultiplier={setCurrentMultiplier}
            />
          {/* </div> */}

          <CometaGameModal
            isOpen={isOpen("cometa")}
            onClose={() => closeTopOverlay()}
            currentMultiplier={currentMultiplier}
            userBalance={userBalance}
            game={game}

            placeBet={placeBet}
            betAmount={betAmount}
            setBetAmount={setBetAmount}

            cashout={cashout}
            hasActiveBet={activeBet}
            hasCashout={hasCashout}
            cashoutAmount={cashoutAmount}




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
            loginMarker={loginMarker}

            
            errorCircle={errorCircle}
            onClearError={() => setErrorMarker(null)}
            // onAstroClick={(astro) => {
            //   openAstroModal(astro);
            // }}
            
            titleZoomText={`V ${__version__()} • Zoom ${Math.round(zoom * 100)}%`}
            session={session ?? null}
            userBalance={user.balance}
            onLogin={handleLogin}
            onOpenDashboard={() => openOverlay("dashboard")}
            width={width}
            height={height}
            
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
            
            previewAstro={previewAstro}
            onPulse={handlePulse}
            onShare={handleShare}
            onPoster={handlePoster}
            isPulsing={isPulsing}

            // Sobre / Termos
            modalAberto={isOpen("sobre")}
            // closeModalSobre={() => closeTopOverlay() }
            isModalTermosOpen={isOpen("termos")}
            // closeModalTermos={ closeTopOverlay() }

            // Purchase / Preview
            isPurchaseModalOpen={isOpen("purchase")}
            closePurchaseModal={() => closeTopOverlay()}
            isPreviewOpen={isOpen("preview")}
            onPreviewOpen={() => openOverlay("preview")}
            closePreviewModal={() => closeTopOverlay()}
            // setIsPreviewOpensetIsPreviewOpen}

            // Astro Details
            onAstroClick={openAstroModal}
            selectedAstro={selectedAstro}
            isAstroModalOpen={isOpen("astro")}
            onCloseAstroDetails={closeAstroModal}

            isMapBlocked={overlayStack.length > 0}
            isRechargeOpen={isOpen("recharge")}
              closeRecharge={() => closeTopOverlay()}
              onOpenRecharge={() => openOverlay}
              targetOff={targetOff}
              currentZoom={currentZoom}

              // Starmap
              // >>> NOVAS PROPS (quadro estelar)
              starmapEnabled={starmapEnabled}
              setStarmapEnabled={setStarmapEnabled}
              starmapTitle={starmapTitle}
              setStarmapTitle={setStarmapTitle}
              locationQuery={locationQuery}
              setLocationQuery={setLocationQuery}
              locationResults={locationResults}
              locationLoading={locationLoading}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              eventDate={eventDate}
              setEventDate={setEventDate}
              eventTime={eventTime}
              setEventTime={setEventTime}
              hideTime={hideTime}
              setHideTime={setHideTime}

              user={user}
              defaultUserName={user.name}
          />
        </>
      )}

      <PosterModal
          isOpen={isOpen("poster")}
          onClose={() => closeTopOverlay()}
          astro={selectedAstro}
        />

        <PosterConfirmModal
        isOpen={isOpen("posterConfirm")}
        onClose={() => closeTopOverlay()}
        astro={selectedAstro}
        price={POSTER_PRICE}
        onConfirm={() => handlePosterPurchase()}
      />

      {isOpen("dashboard") && (
        <UserDashboard
          user={session?.user}
          profile={profile}
          credits={user.balance}
          myAstros={myAstros}
          session={session}
          isOpen={isOpen("dashboard")}
          onClose={() => closeTopOverlay()}
          onAbout={() => openOverlay("sobre")}
          onTerms={() => openOverlay("termos")}
          onFocusAstro={(astro_x, astro_y) => {
            targetOff.current = {
              x: -(astro_x * currentZoom.current) + width / 2,
              y: -(astro_y * currentZoom.current) + height / 2,
            };

            closeTopOverlay();
          }}
          onRecharge={() => {
            openOverlay("recharge");
          }}
          onReferral={() => openOverlay("referral")}
          onLogout={handleLogout}
        />
      )}

      {/* O MODAL SOBRE */}
      <ModalSobre isOpen={isOpen("sobre")} onClose={() => closeTopOverlay()} />

      {/* O MODAL TERMOS */}
      <ModalTermos isOpen={isOpen("termos")} onClose={() => closeTopOverlay()} />

      {/* modal fora do overlay pra não fechar ao clicar */}
      <RechargeModal
        isOpen={isOpen("recharge")}
        onClose={() => closeTopOverlay()}
        onPaid={() => closeTopOverlay()}
        closeAllOverlays={closeAllOverlays}
        closeTopOverlay={closeTopOverlay}
        user={session?.user}
      />

      <ReferralModal
        isOpen={isOpen("referral")}
        onClose={() => closeTopOverlay()}
        user={session?.user}
      />
    </>
  );
};

export default App;
