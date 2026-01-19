import React, { useState, useEffect } from 'react';

const FullscreenMonitor: React.FC = () => {
  const [isNotFullscreen, setIsNotFullscreen] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => {
      // Verifica se existe um elemento em fullscreen
      const isFull = !!document.fullscreenElement;
      setIsNotFullscreen(!isFull);
    };

    // Escuta mudanças no modo fullscreen
    document.addEventListener('fullscreenchange', checkFullscreen);
    
    // Verifica inicialmente após um pequeno delay (para não bugar no load)
    const timeout = setTimeout(checkFullscreen, 2000);

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      clearTimeout(timeout);
    };
  }, []);

  const enterFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    }
  };

  if (!isNotFullscreen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/15 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-indigo-500/30 p-8 rounded-3xl max-w-sm mx-4 text-center shadow-[0_0_50px_rgba(79,70,229,0.2)]">
        <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-expand text-indigo-400 text-2xl animate-pulse"></i>
        </div>
        
        <h2 className="text-white text-xl font-black mb-2 tracking-tight">IMERSÃO TOTAL</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Para uma melhor experiência de exploração estelar, recomendamos o modo tela cheia.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={enterFullscreen}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20 uppercase text-[10px] tracking-[0.2em]"
          >
            Ativar Tela Cheia
          </button>
          
          <button 
            onClick={() => setIsNotFullscreen(false)}
            className="text-slate-500 hover:text-slate-300 font-bold py-2 text-[9px] uppercase tracking-widest transition-colors"
          >
            Continuar em janela
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenMonitor;