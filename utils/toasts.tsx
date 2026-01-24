import React from "react";
import { toast } from "sonner";

export function showPixLoadingToast(message = "Gerando sua recarga PIX estelar...") {
  const id = toast.custom(
    () => (
      <div className="flex items-center gap-3 bg-slate-900/90 border border-indigo-500/30 backdrop-blur-xl text-white px-4 py-3 rounded-2xl shadow-2xl">
        <i className="fa-solid fa-circle-notch animate-spin text-indigo-400" />
        <div className="flex flex-col">
          <span className="text-10px font-black uppercase tracking-widest text-indigo-300">
            Aguarde
          </span>
          <span className="text-sm font-bold">{message}</span>
        </div>
      </div>
    ),
    { duration: Infinity }
  );

  return id;
}
