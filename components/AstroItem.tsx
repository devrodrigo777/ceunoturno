import React from 'react';
import { Astro } from '../types';

interface AstroItemProps {
  astro: Astro;
  onClick: (astro: Astro) => void;
}

const AstroItem: React.FC<AstroItemProps> = ({ astro, onClick }) => {
  const duration = React.useMemo(() => (Math.random() * 3 + 2).toFixed(2) + 's', []);

  return (
    <div
      onClick={() => onClick(astro)}
      className="absolute cursor-pointer group flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
      style={{
        left: astro.x,
        top: astro.y,
      }}
    >
      <div 
        className={`${astro.type === 'star' ? 'twinkle-anim' : ''} relative flex items-center justify-center`}
        style={{ '--duration': duration } as React.CSSProperties}
      >
        {/* Glow / Atmosphere */}
        <div 
          className={`absolute rounded-full opacity-40 group-hover:opacity-80 transition-all ${astro.type === 'nebula' ? 'blur-2xl scale-150' : 'blur-md'}`}
          style={{
            width: `${astro.size * 3.5}px`,
            height: `${astro.size * 3.5}px`,
            backgroundColor: astro.color,
          }}
        />

        {/* Planet Ring */}
        {astro.type === 'planet' && (
          <div className="absolute border border-white/20 rounded-[100%] rotate-[25deg] shadow-lg" 
            style={{ width: astro.size * 2.6, height: astro.size * 0.9 }} />
        )}

        {/* Core Body */}
        <div 
          className={`rounded-full shadow-lg relative z-10 ${astro.type === 'nebula' ? 'blur-[3px]' : ''}`}
          style={{
            width: `${astro.size}px`,
            height: `${astro.size}px`,
            backgroundColor: astro.color,
          }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/30 to-white/40"></div>
        </div>
      </div>
      
      {/* Mini Label */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-50 border border-white/10 uppercase font-black">
        {astro.userName}
      </div>
    </div>
  );
};

export default AstroItem;