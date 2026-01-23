import React, { useEffect } from "react";
import { Astro } from "../types";

import SkyScene from "./SkyScene";
import PurchaseModal from "./PurchaseModal";
import PreviewModal from "./PreviewModal";
import AstroDetailsModal from "./AstroDetailsModal";
import ModalSobre from "./ModalSobre";
import ModalTermos from "./ModalTermos";
import RechargeModal from "./RechargeModal";

type Vec2 = { x: number; y: number };

type Props = {
  // viewport + input
  offset: Vec2;
  zoom: number;
  stopDragging: () => void;
  onStart: (x: number, y: number, target: HTMLElement) => void;
  onMove: (x: number, y: number) => void;
  onTouch: (e: React.TouchEvent) => void;
  onEnd: (x: number, y: number) => void; // seu handleEnd

  // sky constants
  SKY_W: number;
  SKY_H: number;

  // scene
  constellationLines: React.ReactNode;
  astros: Astro[];
  pulseFx: Record<string, number>;
  clickMarker: Vec2 | null;
  errorMarker: Vec2 | null;
  onClearError: () => void;
  onAstroClick: (astro: Astro) => void;

  // header left
  titleZoomText: string; // ex: `VERSÃO 0.1b • Zoom ${Math.round(zoom*100)}%`

  // auth (top-right)
  session: any;
  userBalance: number;
  onLogin: () => void;
  onOpenDashboard: () => void;

  // minimap
  width: number;
  height: number;

  // purchase modal props
  isPurchaseModalOpen: boolean;
  closePurchaseModal: () => void;
  quote: any;

  type: any;
  setType: (t: any) => void;

  msg: string;
  setMsg: (v: string) => void;

  pendingCoords: Vec2 | null;

  color: string;
  setColor: (c: string) => void;

  imagePreviewUrl: string | null;
  onPickImage: (file: File | null) => void;
  removeImage: () => void;

  onConfirmPurchase: () => void;

  // preview modal
  isPreviewOpen: boolean;
  setIsPreviewOpen: (v: boolean) => void;
  previewAstro: Astro | null;

  // astro details modal
  selectedAstro: Astro | null;
  onCloseAstroDetails: () => void;
  onPulse: () => void;
  onShare: () => void;
  isPulsing: boolean;

  // sobre/termos
  modalAberto: boolean;
  closeModalSobre: () => void;

  isModalTermosOpen: boolean;
  closeModalTermos: () => void;
  isMapBlocked: boolean;
};

const SkyViewport: React.FC<Props> = ({
  offset,
  zoom,
  stopDragging,
  onStart,
  onMove,
  onTouch,
  onEnd,

  SKY_W,
  SKY_H,

  constellationLines,
  astros,
  pulseFx,
  clickMarker,
  errorMarker,
  onClearError,
  onAstroClick,

  titleZoomText,

  session,
  userBalance,
  onLogin,
  onOpenDashboard,

  width,
  height,

  isPurchaseModalOpen,
  closePurchaseModal,
  quote,
  type,
  setType,
  msg,
  setMsg,
  pendingCoords,
  color,
  setColor,
  imagePreviewUrl,
  onPickImage,
  removeImage,
  onConfirmPurchase,

  isPreviewOpen,
  setIsPreviewOpen,
  previewAstro,

  selectedAstro,
  onCloseAstroDetails,
  onPulse,
  onShare,
  isPulsing,

  modalAberto,
  closeModalSobre,

  isModalTermosOpen,
  closeModalTermos,
  isMapBlocked,

  isRechargeOpen,
  closeRecharge,

  targetOff,
  currentZoom,
}) => {
    const isMinimapDraggingRef = React.useRef(false);

    const moveToMinimapPoint = (clientX: number, clientY: number, el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect();
    const mx = (clientX - rect.left) / rect.width;  // 0..1
    const my = (clientY - rect.top) / rect.height;  // 0..1

    const clampedX = Math.min(1, Math.max(0, mx));
    const clampedY = Math.min(1, Math.max(0, my));

    const worldX = clampedX * SKY_W;
    const worldY = clampedY * SKY_H;

    // centraliza o ponto no viewport atual
    targetOff.current = {
      x: -worldX * currentZoom.current + window.innerWidth / 2,
      y: -worldY * currentZoom.current + window.innerHeight / 2,
    };
  };

  return (
    <>
      <div
        className="animate-entrance relative w-dvw h-dvh sky-gradient-v2 overflow-hidden select-none"
        onMouseDown={(e) => {
          if (isMapBlocked) return;
          onStart(e.clientX, e.clientY, e.target as HTMLElement);
        }}
        onMouseMove={(e) => {
          if (isMapBlocked) return;
          onMove(e.clientX, e.clientY);
        }}
        onMouseUp={(e) => {
          stopDragging();
          const target = e.target as HTMLElement;
          if (!target.closest(".modal-content") && !target.closest("button")) {
            if (!isMapBlocked) onEnd(e.clientX, e.clientY);
          }
        }}
        onTouchStart={(e) => {
          if (isMapBlocked) return;
          onStart(
            e.touches[0].clientX,
            e.touches[0].clientY,
            e.target as HTMLElement,
          );
        }}
        onTouchMove={(e) => {
          if (isMapBlocked) return;
          onTouch(e);
        }}
        onTouchEnd={(e) => {
          stopDragging();
          const touch = e.changedTouches[0];
          const target = e.target as HTMLElement;

          if (!target.closest(".modal-content") && !target.closest("button")) {
            if (!isMapBlocked) onEnd(touch.clientX, touch.clientY);
          }
        }}
      >
        <SkyScene
          offset={offset}
          zoom={zoom}
          SKY_W={SKY_W}
          SKY_H={SKY_H}
          constellationLines={constellationLines}
          astros={astros}
          pulseFx={pulseFx}
          clickMarker={clickMarker}
          errorMarker={errorMarker}
          onClearError={onClearError}
          onAstroClick={onAstroClick}
        />

        {/* Interface Overlay */}
        <div className="absolute top-6 left-6 pointer-events-none z-10">
          <h1 className="text-2xl font-black text-white tracking-tighter drop-shadow-2xl">
            {/* CÉU<span className="text-yellow-400 italic">NOTURNO</span> */}
            <img src={"./logo.png"} alt="Céu Noturno" className="w-40" />
          </h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">
            {titleZoomText}
          </p>
        </div>

        {/* Auth top-right */}
        {!session ? (
          <div className="absolute top-6 right-6 z-10 bg-slate-900/40 border animate-pulse border-white/10 backdrop-blur-xl p-2 pr-5 rounded-2xl flex items-center gap-3">
            <button
              onClick={onLogin}
              className="text-white pointer-events-auto font-black px-3 py-1 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs tracking-[0.2em] flex items-center gap-3 mx-auto"
            >
              <i className="fa-solid fa-user text-lg"></i> ACESSAR
            </button>
          </div>
        ) : (
          <div className="absolute top-6 right-6 z-10 p-2 pr-5 rounded-2xl flex items-center gap-3">
            {/* SALDO DE CRÉDITOS */}
            <div className="bg-slate-900/60 border border-white/10 px-3 py-2 rounded-xl">
              <span className="text-yellow-400 font-black text-xs">
                ★ {userBalance}
              </span>
            </div>

            <div className="flex flex-col items-center gap-3">
            {/* AVATAR DO GOOGLE */}
            <button onClick={onOpenDashboard} className="group relative">
              <img
                src={session.user.user_metadata.avatar_url}
                alt="Perfil"
                className="w-10 h-10 rounded-xl border-2 border-indigo-500 shadow-lg group-hover:scale-105 transition-transform"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
            </button>
            </div>
          </div>
        )}

        {/* Minimap for Navigation */}
        <div className="fixed bottom-6 right-6 w-36 h-24 bg-black/60 border border-white/10 rounded-xl backdrop-blur-md overflow-hidden z-20 pointer-events-auto shadow-2xl"
          onMouseDown={(e) => {
            e.stopPropagation();
            isMinimapDraggingRef.current = true;
            moveToMinimapPoint(e.clientX, e.clientY, e.currentTarget);
          }}
          onMouseMove={(e) => {
            if (!isMinimapDraggingRef.current) return;
            e.stopPropagation();
            moveToMinimapPoint(e.clientX, e.clientY, e.currentTarget);
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            isMinimapDraggingRef.current = false;
          }}
          onMouseLeave={() => {
            isMinimapDraggingRef.current = false;
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            e.preventDefault();
            isMinimapDraggingRef.current = true;
            const t = e.touches[0];
            moveToMinimapPoint(t.clientX, t.clientY, e.currentTarget);
          }}
          onTouchMove={(e) => {
            if (!isMinimapDraggingRef.current) return;
            e.stopPropagation();
            e.preventDefault();
            const t = e.touches[0];
            moveToMinimapPoint(t.clientX, t.clientY, e.currentTarget);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            isMinimapDraggingRef.current = false;
          }}
        >
          {/* Dots dos astros */}
          {astros.map((a) => (
            <div
              key={a.id}
              className="absolute rounded-full bg-white/80"
              style={{
                left: `${(a.x / SKY_W) * 100}%`,
                top: `${(a.y / SKY_H) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: `2px`,
                height: `2px`,
                backgroundColor: `${a.color}`, // Define a cor do cia.color,
              }}
            />
          ))}
          <div
            className="absolute bg-white/20 border border-white/40 rounded-sm"
            style={{
              width: `${(width / (SKY_W * zoom)) * 100}%`,
              height: `${(height / (SKY_H * zoom)) * 100}%`,
              left: `${(-offset.x / (SKY_W * zoom)) * 100}%`,
              top: `${(-offset.y / (SKY_H * zoom)) * 100}%`,
            }}
          />
        </div>

        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center z-30 w-full px-6 pointer-events-none">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] mb-4 animate-pulse">
            Toque em um astro e descubra sua mensagem
          </p>
        </div>

        <PurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={closePurchaseModal}
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
          userBalance={userBalance}
          onConfirmPurchase={onConfirmPurchase}
          onOpenPreview={() => setIsPreviewOpen(true)}
          SKY_W={SKY_W}
          SKY_H={SKY_H}
        />

        <PreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          previewAstro={previewAstro}
          imagePreviewUrl={imagePreviewUrl}
          msg={msg}
          color={color}
        />

        <AstroDetailsModal
          selectedAstro={selectedAstro}
          onClose={onCloseAstroDetails}
          onPulse={onPulse}
          onShare={onShare}
          isPulsing={isPulsing}
          isLogged={!!session?.user}
        />

        {/* O MODAL SOBRE */}
        <ModalSobre isOpen={modalAberto} onClose={closeModalSobre} />

        {/* O MODAL TERMOS */}
        <ModalTermos isOpen={isModalTermosOpen} onClose={closeModalTermos} />

        {/* modal fora do overlay pra não fechar ao clicar */}
        <RechargeModal
          isOpen={isRechargeOpen}
          onClose={closeRecharge}
          onPaid={() => {
            closeRecharge();
            // seu saldo atualiza via realtime do profiles automaticamente [file:1]
          }}
        />
      </div>
    </>
  );
};

export default SkyViewport;
