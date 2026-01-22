import React, { useEffect, useState } from "react";
import { AstroType } from "../types";
import Modal from "./Modal";
import { ASTRO_AREAS, ASTRO_COLORS, ASTRO_NAMES } from "../constants";
import { calculateFrontendPrice } from "../utils/astro";

type Props = {
  isOpen: boolean;
  onClose: () => void;

  quote: any;

  type: AstroType;
  setType: (t: AstroType) => void;

  msg: string;
  setMsg: (v: string) => void;

  pendingCoords: { x: number; y: number } | null;

  color: string;
  setColor: (c: string) => void;

  // imagem
  imagePreviewUrl: string | null;
  onPickImage: (file: File | null) => void;
  removeImage: () => void;

  // compra
  userBalance: number;
  onConfirmPurchase: () => void;

  // preview
  onOpenPreview: () => void;

  SKY_W: number;
  SKY_H: number;
};

const PurchaseModal: React.FC<Props> = ({
  isOpen,
  onClose,
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
  userBalance,
  onConfirmPurchase,
  onOpenPreview,
  SKY_W,
  SKY_H,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (isOpen){
      setStep(1);
      setType("star");
      setColor(ASTRO_COLORS[0]);
      setMsg("");
    }
  }, [isOpen]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Novo Astro - ${step==1 ? "Tipo" : "Confirmação"}`}>
      {!quote ? (
        <div className="text-center text-slate-400 text-sm">
          Calculando valores...
        </div>
      ) : (
        <>
        { step === 1 && (
          <>
            {/* O astro que será descoberto */}
            <p className="text-slate-400">Selecione o tipo do astro</p>
            <div className="flex gap-2 p-1 bg-slate-800 rounded-2xl border border-white/5 mt-2">
              {(["star", "planet", "nebula"] as AstroType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${type === t ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <i
                    className={`fa-solid ${t === "star" ? "fa-star" : t === "planet" ? "fa-earth-americas" : "fa-cloud-sun"}`}
                  ></i>
                  <span className="text-[9px] font-black uppercase">
                    {ASTRO_NAMES[t]}
                  </span>
                  <span className="text-[9px] opacity-70 text-yellow-400">
                    ★{quote.type_prices[t]}
                  </span>
                </button>
              ))}
            </div>

            {pendingCoords && (
            <>
              <div className="grid grid-cols-2 gap-2 my-2">
                <div className="p-4 bg-slate-800 rounded-xl border border-white/5 text-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase mb-2">
                    Coordenada
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-white text-sm font-black">
                      {Math.round(quote.x)} : {Math.round(quote.y)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800 rounded-xl border border-white/5 text-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase mb-2">
                    Região Estelar
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-white text-sm font-black">
                      {ASTRO_AREAS[quote.area] || "Desconhecido"}
                      <p className="text-[10px] text-yellow-400">
                        {quote.base_price} <i className="fa-solid fa-star"></i>
                      </p>
                    </p>
                  </div>
                </div>
              </div>

              {/* MINIMAPA DE LOCALIZAÇÃO */}
              <div className="relative w-full h-32 bg-slate-900/50 border border-white/10 rounded-xl my-2 overflow-hidden">
                <div className="absolute inset-0 opacity-20 sky-gradient-v2" />

                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-10">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="border-[0.5px] border-white" />
                  ))}
                </div>

                <div
                  className="absolute w-3 h-3 rounded-full shadow-[0_0_10px_#facc15] animate-pulse"
                  style={{
                    left: `${(quote.x / SKY_W) * 100}%`,
                    top: `${(quote.y / SKY_H) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: color,
                    boxShadow: `0 0 15px ${color}`,
                  }}
                />

                <div className="absolute bottom-2 right-2">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">
                    Localização no Firmamento
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3 my-2 mb-4">
                {ASTRO_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-8 rounded-lg transition-all ${color === c ? "ring-2 ring-white scale-110 shadow-lg" : "opacity-40 hover:opacity-100"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!pendingCoords}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest border border-white/10 text-xs"
              >
                <i className="fa-solid fa-eye mr-2"></i> Próxima Etapa (★ {calculateFrontendPrice(quote, type)})
              </button>
            </>
          )}
          </>
        )}

        { step === 2 && (
          <>
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={!pendingCoords}
                className="w-full text-left text-white font-black rounded-xl transition-all uppercase tracking-widest text-xs"
              >
                <i className="fa-solid fa-chevron-left mr-2"></i> Voltar
              </button>
            {/* Mensagem Eterna */}
            <div>
              <label className="block text-slate-500 text-[10px] font-black uppercase mb-2">
                Foto (opcional)
              </label>
              <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                className="hidden"
              />

              <div className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm cursor-pointer hover:border-indigo-500/50 transition flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-image text-indigo-400" />
                  <span className="text-slate-300 font-bold">
                    {imagePreviewUrl ? "Alterar imagem" : "Adicionar imagem"}
                  </span>
                </div>

                <span className="text-10px text-slate-500 font-black uppercase tracking-widest">
                  JPG/PNG
                </span>
              </div>
            </label>

              {imagePreviewUrl && (
                <div className="mt-2">
                  {/* Botão remover */}
                  <button
                    onClick={removeImage}
                    className="text-red-500 text-xs underline mb-1"
                  >
                    Remover Imagem
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-500 text-[10px] font-black uppercase mb-2">
                Mensagem Eterna
              </label>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="O que você deseja transmitir ao firmamento?"
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm h-24 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>

            

            

            {userBalance >= calculateFrontendPrice(quote, type) && (
              <button
                onClick={onConfirmPurchase}
                className="w-full bg-yellow-400 text-slate-950 font-black py-4 rounded-xl shadow-xl transition-all uppercase tracking-widest text-xs"
              >
                Confirmar Reivindicação (★ {calculateFrontendPrice(quote, type)})
              </button>
            )}

            {userBalance < calculateFrontendPrice(quote, type) && (
              <p className="text-center w-full bg-yellow-400 bg-opacity-50 text-slate-950 font-black py-4 rounded-xl shadow-xl transition-all uppercase tracking-widest text-xs">
                Saldo insuficiente (★ {calculateFrontendPrice(quote, type)})
              </p>
            )}

            <button
              type="button"
              onClick={onOpenPreview}
              disabled={!pendingCoords}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest border border-white/10 text-xs"
            >
              <i className="fa-solid fa-eye mr-2"></i> Prévia da Mensagem
            </button>
          </div>
          </>
        )}
        </>
      )}
    </Modal>
  );
};

export default PurchaseModal;
