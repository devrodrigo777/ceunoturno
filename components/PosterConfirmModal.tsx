import React, { useState } from "react";
import Modal from "./Modal";
import type { Astro } from "../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  astro: Astro | null;
  price?: number; // default 1000
  onConfirm: () => Promise<string | number>;
};

export default function PosterConfirmModal({
  isOpen,
  onClose,
  astro,
  price = 1000,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar">
      <div className="space-y-4 text-center">
        <p className="text-white font-black">
          Deseja criar um pôster estelar desse astro?
        </p>

        {!!astro && (
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {astro.coordinate}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs border border-white/10"
          >
            Não
          </button>

          <button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await onConfirm();
              } finally {
                setLoading(false);
              }
            }}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i>
                Processando...
              </>
            ) : (
              <>
                Sim{" "}
                <span className="text-black">
                  {price} <i className="fa-solid fa-bolt"></i>
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
