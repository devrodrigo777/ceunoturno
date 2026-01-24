import React from "react";
import AstroItem from "./AstroItem";
import { Astro } from "../types";

type Vec2 = { x: number; y: number };

type Props = {
  offset: Vec2;
  zoom: number;

  SKY_W: number;
  SKY_H: number;

  constellationLines: React.ReactNode;

  astros: Astro[];
  pulseFx: Record<string, number>;

  clickMarker: Vec2 | null;
  errorMarker: Vec2 | null;
  loginMarker: Vec2 | null;

  onAstroClick: (astro: Astro) => void;
  onClearError: () => void;
  errorCircle: React.FC<any> | null;
};

const SkyScene: React.FC<Props> = ({
  offset,
  zoom,
  SKY_W,
  SKY_H,
  constellationLines,
  astros,
  pulseFx,
  clickMarker,
  errorMarker,
  loginMarker,
  onAstroClick,
  onClearError,
  errorCircle,
}) => {
  return (
    <div
      className="absolute sky-canvas star-overlay"
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
        width: SKY_W,
        height: SKY_H,
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${SKY_W} ${SKY_H}`}
      >
        {constellationLines}
      </svg>

      {errorCircle && (
        <div
          className="pointer-events-none absolute z-50"
          style={{
            left: errorCircle.x,
            top: errorCircle.y,
            width: errorCircle.r * 2,
            height: errorCircle.r * 2,
            transform: "translate(-50%, -50%)",
            borderRadius: "9999px",
            border: "2px dashed rgba(255, 255, 255, 0.4)", // red-500
            boxShadow: "0 0 25px rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)",
          }}
        />
      )}

      {/* Badge de Info (login necessário) */}
      {loginMarker && (
        <div
          className="absolute pointer-events-none z-50 flex flex-col items-center gap-2"
          style={{
            left: loginMarker.x,
            top: loginMarker.y,
            transform: "translate(-50%, -50%)",
          }}
        >

          {/* Ícone e Texto */}
          <div className="bg-green-400/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-400 shadow-xl flex items-center gap-2 animate-bounce">
            <i className="fa-solid fa-circle-exclamation text-white text-xs"></i>
            <span className="text-white font-black text-[9px] uppercase tracking-tighter whitespace-nowrap">
              Acesse Para Criar
            </span>
          </div>
        </div>
      )}

      {/* Badge de Erro (Too Close) */}
      {errorMarker && (
        <div
          className="absolute pointer-events-none z-50 flex flex-col items-center gap-2"
          style={{
            left: errorMarker.x,
            top: errorMarker.y,
            transform: "translate(-50%, -50%)",
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
            transform: "translate(-50%, -50%)",
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
        <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">
          Horizonte
        </span>
      </div>

      <div className="absolute top-[8%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
        <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">
          Zênite
        </span>
      </div>

      <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 opacity-50 pointer-events-none">
        <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">
          Nadir
        </span>
      </div>

      <div className="absolute top-1/2 left-[5%] -translate-y-1/2 -rotate-90 opacity-50 pointer-events-none">
        <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">
          Horizonte Leste
        </span>
      </div>

      <div className="absolute top-1/2 right-[5%] -translate-y-1/2 rotate-90 opacity-50 pointer-events-none">
        <span className="px-5 py-2 rounded-full border border-white/10 bg-black/30 text-[10px] text-white font-black tracking-[0.4em] uppercase">
          Horizonte Oeste
        </span>
      </div>

      {astros.map((a) => (
        <AstroItem
          key={a.id}
          astro={a}
          onClick={() => {
            onClearError();
            onAstroClick(a);
          }}
          pulseFxAt={pulseFx[a.id]}
        />
      ))}
    </div>
  );
};

export default SkyScene;
