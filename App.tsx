import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Astro, AstroPosition, User, AstroType } from './types';
import { POSITION_PRICES, TYPE_PRICES, ASTRO_COLORS, INITIAL_ASTROS } from './constants';
import AstroItem from './components/AstroItem';
import Modal from './components/Modal';
import FullscreenPrompt from './components/FullScreenPrompt';
import SplashScreen from './components/SplashScreen';

const SKY_W = 4000;
const SKY_H = 3000;
const FRICTION = 0.90;
const LERP = 0.05;
const MIN_Z = 0.95;
const MAX_Z = 1.5;
const DRAG_SENSITIVITY = 1; // Fator para controlar a sensibilidade do arrasto
const MIN_ASTRO_DISTANCE = 140; // Distância mínima de segurança entre astros

const App: React.FC = () => {
  const [astros, setAstros] = useState<Astro[]>(INITIAL_ASTROS);
  const [user, setUser] = useState<User>({ id: 'u1', name: 'Explorador', balance: 2500 });
  const [selectedAstro, setSelectedAstro] = useState<Astro | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // Click position marker
  const [clickMarker, setClickMarker] = useState<{x: number, y: number} | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleMapClick = (clientX: number, clientY: number) => {

      if(Math.abs(velocity.current.x) < 0.5 && Math.abs(velocity.current.y) < 0.5)
      {
        // Converte pixel da tela para coordenada real do Canvas
        const canvasX = (clientX - offset.x) / zoom;
        const canvasY = (clientY - offset.y) / zoom;

        let zona = null;

        // Verificamos primeiro as extremidades verticais (Zênite e Nadir)
        if (canvasY < 700) {
          zona = AstroPosition.ZENITH;
        } else if (canvasY > 2400) {
          zona = AstroPosition.NADIR;
        } else {
          // Se estiver no meio vertical, verificamos as laterais (Leste/Oeste)
          if (canvasX < 1300) {
            zona = AstroPosition.HORIZON_LEFT;
          } else if (canvasX > 2700) {
            zona = AstroPosition.HORIZON_RIGHT;
          } else {
            zona = AstroPosition.HORIZON;
          }
        }

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
          setShowIntro(true); // Após carregar, mostra o pedido de Fullscreen
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

  const handlePurchase = () => {
    const total = POSITION_PRICES[pos] + TYPE_PRICES[type];
    if (user.balance < total) return alert('Créditos estelares insuficientes!');

    // Safety Distance Enforcement (Collision)
    let x = 0, y = 0, attempts = 0;
    let safe = false;
    const MAX_ATTEMPTS = 50; // Limite de tentativas para encontrar uma posição segura

    while (attempts < MAX_ATTEMPTS) {
      switch (pos) {
        case AstroPosition.ZENITH: x = 1200 + Math.random() * 600; y = 700 + Math.random() * 600; break;
        case AstroPosition.HORIZON_LEFT: x = 200 + Math.random() * 600; y = 800 + Math.random() * 800; break;
        case AstroPosition.HORIZON_RIGHT: x = 2200 + Math.random() * 600; y = 800 + Math.random() * 800; break;
        case AstroPosition.HORIZON: x = 500 + Math.random() * 2000; y = 150 + Math.random() * 300; break;
        case AstroPosition.NADIR: x = 500 + Math.random() * 2000; y = 1600 + Math.random() * 300; break;
      }
      
      // Verifica se a nova posição está muito próxima de algum astro existente
      const isTooClose = astros.some(a => Math.hypot(a.x - x, a.y - y) < MIN_ASTRO_DISTANCE);
      if (!isTooClose) {
        safe = true;
        break;
      }
      attempts++;
    }

    if (!safe) {
      return alert('Esta região está muito congestionada. Tente outra posição ou aguarde por um espaço.');
    }

    const newAstro: Astro = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id, userName: user.name,
      message: msg || "Um brilho na eternidade...",
      position: pos, type, color,
      size: type === 'nebula' ? 50 : type === 'planet' ? 24 : 12,
      x, y, coordinate: generateFictionalCoordinate(), createdAt: Date.now()
    };

    setAstros(prev => [...prev, newAstro]);
    setUser(prev => ({ ...prev, balance: prev.balance - total }));
    setIsPurchaseModalOpen(false);
    // Focus view on new astro
    targetOff.current = { x: -(x * currentZoom.current) + window.innerWidth/2, y: -(y * currentZoom.current) + window.innerHeight/2 };
  };

  return (
    <>
      {/* Ordem de Camadas: Splash -> Modal Fullscreen -> App */}
      {isLoading && <SplashScreen progress={progress} />}
      
      {showIntro && <FullscreenPrompt onEnter={handleEnableFullScreen} />}

      {!showIntro && !isLoading && (
        <>
          <div className="animate-entrance relative w-dvw h-dvh sky-gradient-v2 overflow-hidden select-none"
            onMouseDown={e => onStart(e.clientX, e.clientY, e.target as HTMLElement)}
            onMouseMove={e => onMove(e.clientX, e.clientY)}
            onMouseUp={() => {setIsDragging(false); pinchDist.current = null; handleEnd(lastMousePos.current.x, lastMousePos.current.y);}}
            onTouchStart={e => onStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement)}
            onTouchMove={onTouch}
            onTouchEnd={() => {setIsDragging(false); pinchDist.current = null; handleEnd(lastMousePos.current.x, lastMousePos.current.y);}}>
            
            <div className="absolute sky-canvas star-overlay" style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`, width: SKY_W, height: SKY_H }}>
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
              <h1 className="text-3xl font-black text-white tracking-tighter drop-shadow-2xl">CÉU<span className="text-yellow-400 italic">NOTURNO</span></h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">VERSÃO 0.1b • Zoom {Math.round(zoom*100)}%</p>
            </div>

            {/* <div className="absolute top-6 right-6 z-10 bg-slate-900/40 border border-white/10 backdrop-blur-xl p-2 pr-5 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">{user.name[0]}</div>
              <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold uppercase">Saldo</span><span className="text-sm text-yellow-400 font-black">★ {user.balance}</span></div>
            </div> */}
            <div className="absolute top-6 right-6 z-10 bg-slate-900/40 border animate-pulse border-white/10 backdrop-blur-xl p-2 pr-5 rounded-2xl flex items-center gap-3">
              <button onClick={(e) => { e.preventDefault() }} className="text-white pointer-events-auto font-black px-3 py-1 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs tracking-[0.2em] flex items-center gap-3 mx-auto">
                <i className="fa-solid fa-question text-lg"></i> ENTENDA
              </button>
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
                      <span className="text-[8px] opacity-70">+★{TYPE_PRICES[t]}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-black uppercase mb-2">Mensagem Eterna</label>
                  <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="O que você deseja transmitir ao firmamento?" className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm h-24 focus:ring-1 focus:ring-indigo-500 outline-none resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(POSITION_PRICES) as AstroPosition[]).map(p => (
                    <button key={p} onClick={() => setPos(p)} className={`p-2 rounded-lg border text-[9px] font-black uppercase flex justify-between ${pos === p ? 'border-yellow-400 text-yellow-400 bg-yellow-400/5' : 'border-white/5 text-slate-500'}`}>
                      <span>{p}</span><span>★{POSITION_PRICES[p]}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {ASTRO_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`h-8 rounded-lg transition-all ${color === c ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-40 hover:opacity-100'}`} style={{backgroundColor: c}} />)}
                </div>
                <button onClick={handlePurchase} className="w-full bg-yellow-400 text-slate-950 font-black py-4 rounded-xl shadow-xl transition-all uppercase tracking-widest text-xs">Confirmar Reivindicação (★ {POSITION_PRICES[pos] + TYPE_PRICES[type]})</button>
              </div>
            </Modal>

            {/* Astro Details Modal */}
            <Modal isOpen={!!selectedAstro} onClose={() => setSelectedAstro(null)} title="Sinal Identificado">
              <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-8 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full blur-3xl opacity-30" style={{backgroundColor: selectedAstro?.color}} />
                  <div className={`w-14 h-14 rounded-full relative z-10 flex items-center justify-center modal-star-anim shadow-2xl`} style={{backgroundColor: selectedAstro?.color, boxShadow: `0 0 50px ${selectedAstro?.color}aa`}}>
                      <div className="absolute inset-0 rounded-full bg-white/30 blur-[2px]" />
                  </div>
                </div>
                <p className="text-2xl text-white font-serif italic leading-relaxed px-4">"{selectedAstro?.message}"</p>
                <div className="mt-8 pt-6 border-t border-white/5 space-y-1">
                  <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-[0.2em]">{selectedAstro?.coordinate}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Observado por {selectedAstro?.userName}</p>
                </div>
              </div>
            </Modal>
          </div>
        </>
      )}
    </>
  );
};

export default App;