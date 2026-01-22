import React, { useEffect } from "react";
import Modal from "./Modal";
import { Astro } from "../types";

type Props = {
  selectedAstro: Astro | null;
  onClose: () => void;

  onPulse: () => void;
  onShare: () => void;

  isPulsing: boolean;
  isLogged: boolean;
};

const AstroDetailsModal: React.FC<Props> = ({
  selectedAstro,
  onClose,
  onPulse,
  onShare,
  isPulsing,
  isLogged,
}) => {
  // useEffect(() => {
  //   history.pushState({ ui: "astro" }, "");
  // });
  return (
    <Modal isOpen={!!selectedAstro} onClose={onClose} title="Explorando">
      {!!selectedAstro && (
        <div className="animate-entrance backdrop-blur-sm text-center py-6">
          <div className="w-24 h-24 mx-auto mb-8 flex items-center justify-center relative">
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-30"
              style={{ backgroundColor: selectedAstro.color }}
            />
            <div
              className="w-14 h-14 rounded-full relative z-10 flex items-center justify-center modal-star-anim shadow-2xl"
              style={{
                backgroundColor: selectedAstro.color,
                boxShadow: `0 0 50px ${selectedAstro.color}aa`,
              }}
            >
              <div className="absolute inset-0 rounded-full bg-white/30 blur-[2px]" />
            </div>
          </div>

          {selectedAstro.image_url && (
            <img
              src={selectedAstro.image_url}
              alt="Imagem do astro"
              className="w-full max-h-80 object-cover rounded-2xl border border-white/10 mt-6"
            />
          )}

          <p className="text-2xl text-white font-serif italic leading-relaxed px-4">
            {selectedAstro.message}
          </p>

          <div className="mt-8 pt-6 border-t border-white/5 space-y-1">
            <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-[0.2em]">
              {selectedAstro.coordinate}
            </p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Observado por {selectedAstro.user_name}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-10 gap-3">
            <button
              onClick={onPulse}
              disabled={!isLogged || isPulsing}
              className="col-span-4 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              {isPulsing ? "Pulsando" : "Pulsar"}
            </button>

            <button
              onClick={onShare}
              className="col-span-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-share-nodes"></i> Compartilhar
            </button>
          </div>

          {isLogged && (
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-3">
              Pulsar custa 30 Energias Estelares.
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-6 text-[12px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-eye text-indigo-400"></i>
              <span>{selectedAstro.views ?? 0}</span>
              <span className="text-slate-500 font-bold">Visualizações</span>
            </div>

            <div className="flex items-center gap-2">
              <i className="fa-solid fa-bolt-lightning text-yellow-400"></i>
              <span>{selectedAstro.pulses ?? 0}</span>
              <span className="text-slate-500 font-bold">Pulsos</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AstroDetailsModal;
