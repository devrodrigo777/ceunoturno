import React from 'react';
import { useEffect } from 'react';

const SplashScreen: React.FC<{ progress: number }> = ({ progress, onComplete }) => {

  useEffect(() => {
    if (progress >= 100) {
        onComplete(); // Agora o React sabe que isso é um "efeito colateral" após o render
    }
    }, [progress, onComplete]);

  return (
    <div className="animate-entrance fixed inset-0 z-[110] bg-[#020617] flex flex-col items-center justify-center p-6">
      {/* Elemento Visual Central */}
      <div className="relative w-32 h-32 mb-10">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-[spin_4s_linear_infinite]" />
        <div className="absolute inset-2 rounded-full border border-indigo-400/40 animate-[spin_2s_linear_infinite_reverse]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fa-solid fa-atom text-4xl text-indigo-500 animate-pulse"></i>
        </div>
      </div>

      <div className="text-center space-y-4 max-w-xs">
  
        <div className="flex items-center justify-center gap-4">
          <img src={"./logo.png"} alt="Céu Noturno" className="w-60" />
          </div>
        
        {/* Barra de Progresso */}
        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-indigo-600 to-yellow-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
          {progress < 40 ? 'Sincronizando Mapas Estelares...' : 
           progress < 80 ? 'Alinhando Coordenadas...' : 
           'Finalizando Inicialização...'}
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;