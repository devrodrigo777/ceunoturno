import React from "react";
import Modal from "./Modal";
import { Astro } from "../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  previewAstro: Astro | null;
  imagePreviewUrl: string | null;
  msg: string;
  color: string;
};

const PreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  previewAstro,
  imagePreviewUrl,
  msg,
  color,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Prévia do Astro">
      {previewAstro && (
        <div className="animate-entrance backdrop-blur-sm text-center py-6">
          <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center relative">
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-30"
              style={{ backgroundColor: previewAstro.color }}
            />
            <div
              className="w-14 h-14 rounded-full relative z-10 flex items-center justify-center modal-star-anim shadow-2xl"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 50px ${color}`,
              }}
            >
              <div className="absolute inset-0 rounded-full bg-white/30 blur-[2px]" />
            </div>
          </div>

          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt="Imagem do astro (prévia)"
              className="w-full max-h-64 object-cover rounded-2xl border border-white/10 mb-6"
            />
          )}

          <p className="text-2xl text-white font-serif italic leading-relaxed px-4">
            {msg}
          </p>

          <div className="mt-8 pt-6 border-t border-white/5 space-y-1">
            <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-[0.2em]">
              RA 00h 00m
            </p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Observado por {previewAstro.user_name}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-6 text-[12px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-eye text-indigo-400"></i>
              <span>0</span>
              <span className="text-slate-500 font-bold">Visualizações</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-bolt-lightning text-yellow-400"></i>
              <span>0</span>
              <span className="text-slate-500 font-bold">Pulsos</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PreviewModal;
