import React, { useState } from 'react';

const FullscreenPrompt: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  const [loadingFullscreen, setLoadingFullscreen] = useState(false);

  const handleEnterClick = () => {
    setLoadingFullscreen(true);
    onEnter();
  };

  return (
    <div className="animate-entrance fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center p-6 text-center overflow-y-auto">
      <div className="max-w-sm w-full space-y-8 py-8">
        
        {/* Ícone e Título Principal */}
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
          <div className="relative space-y-4">
            <i className="fa-solid fa-rocket text-4xl text-yellow-400"></i>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
              Pronto para <br />
              <span className="text-indigo-400 italic">Decolar?</span>
            </h2>
          </div>
        </div>

        {/* Grid de Instruções da Engine */}
        <div className="grid grid-cols-1 gap-3 text-left">
          <InstructionItem 
            icon="fa-fingerprint" 
            title="Navegação" 
            desc="Arraste para explorar o mapa estelar." 
          />
          <InstructionItem 
            icon="fa-magnifying-glass-plus" 
            title="Zoom" 
            desc="Use dois dedos (pinch) para aproximar." 
          />
          <InstructionItem 
            icon="fa-star" 
            title="Reivindicação" 
            desc="Toque em espaços vazios para criar astros." 
          />
        </div>

        {/* Botão de Ação */}
        <div className="space-y-4">
          <button 
            onClick={handleEnterClick}
            disabled={loadingFullscreen}
            className="w-full bg-indigo-600 disabled:bg-indigo-800 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-95 uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3"
          >
            {loadingFullscreen ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i> Inicializando...
              </>
            ) : (
              <>
                Iniciar Aventura <i className="fa-solid fa-expand"></i>
              </>
            )}
          </button>
          
          <p className="text-slate-500 text-[10px] font-medium leading-relaxed px-4 italic">
            Ao clicar no botão, a aplicação será aberta em tela cheia. Isso é recomendado para uma calibração perfeita das coordenadas astronômicas."
          </p>
        </div>
      </div>
    </div>
  );
};

// Sub-componente para organizar os itens de instrução
const InstructionItem: React.FC<{ icon: string, title: string, desc: string }> = ({ icon, title, desc }) => (
  <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
    <div className="w-10 h-10 flex-shrink-0 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
      <i className={`fa-solid ${icon} text-indigo-400`}></i>
    </div>
    <div>
      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{title}</h4>
      <p className="text-xs text-slate-400">{desc}</p>
    </div>
  </div>
);

export default FullscreenPrompt;