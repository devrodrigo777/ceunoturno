import React from 'react';
import { Astro } from '../types';

interface AstroItemProps {
  astro: Astro;
  onClick: (astro: Astro) => void;
  pulseFxAt?: number;
}

const AstroItem: React.FC<AstroItemProps> = ({ astro, onClick, pulseFxAt }) => {
  const duration = React.useMemo(() => (Math.random() * 3 + 2).toFixed(2) + 's', []);
  const fadeInScale = "animate-[scaleIn_0.5s_ease-out]";
  // Verifica se o astro foi criado nos últimos 3 segundos
  const isNew = new Date().getTime() - new Date(astro.created_at).getTime() < 3000;
  // const isPulseFx = pulseFxAt && Date.now() - pulseFxAt < 900;
  const isPulseFx = !!pulseFxAt && Date.now() - pulseFxAt < 1200;

  astro.size = astro.size || 100;
  // console.log(astro);
  return (
    <div
      onClick={() => onClick(astro)}
      className={`absolute cursor-pointer group flex items-center justify-center -translate-x-1/2 -translate-y-1/2 ${isPulseFx ? 'animate-pulseShock' : ''} ${isNew ? 'animate-birth' : ''}`}
      style={{
        left: astro.x,
        top: astro.y,
      }}
      
    >
      {isPulseFx && (
        <>
          <div
            className="shockwave-core"
            style={{ filter: `drop-shadow(0 0 12px ${astro.color}66)` }}
          />
          <div
            className="shockwave-ring"
            style={{ borderColor: `${astro.color}AA` }}
          />
          <div
            className="shockwave-ring shockwave-ring--soft"
            style={{ borderColor: `${astro.color}55` }}
          />
        </>
      )}
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

        {(astro.pulses ?? 0) >= 10 && (
        <div
          className="prestige-ring"
          style={{
            borderColor: `${astro.color}44`,
            boxShadow: `0 0 22px ${astro.color}15, 0 0 60px ${astro.color}60`,
          }}
        />
      )}

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
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 pointer-events-none display-none group-hover:block opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-50 border border-white/10 uppercase font-black">
        {astro.user_name}
      </div>
    </div>
  );
};

export default AstroItem;