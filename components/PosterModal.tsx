import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import type { Astro } from "@/types";
import { renderStarPoster } from "@/utils/renderStarPoster";

export default function PosterModal({
  isOpen,
  onClose,
  astro,
}: {
  isOpen: boolean;
  onClose: () => void;
  astro: Astro | null;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [usePhotoBg, setUsePhotoBg] = useState(true);

  useEffect(() => {
    console.log("abriu o poster");
    if (!isOpen || !astro) return;
    let cancelled = false;
    console.log("aberto ainda");

    (async () => {
      const canvas = await renderStarPoster(astro, {
        sizePx: 2000, // preview rápido
        usePhotoBg,
        title: "ONDE TUDO COMEÇOU",
        subtitle: "Nosso primeiro beijo",
        footer: astro.coordinate ?? "",
        markAstro: true,
      });
      if (!cancelled) setDataUrl(canvas.toDataURL("image/png"));
    })();

    return () => { cancelled = true; };
  }, [isOpen, astro, usePhotoBg]);

  const download = async () => {
    if (!astro) return;
    const canvas = await renderStarPoster(astro, {
      sizePx: 1000, // preview rápido
        usePhotoBg,
        title: "ONDE TUDO COMEÇOU",
        subtitle: "Nosso primeiro beijo",
        footer: astro.coordinate ?? "",
        markAstro: true,
    });

    console.log("download!");

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ceu-noturno-${astro.id}.png`;
    a.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pôster para imprimir">
      {!astro ? null : (
        <div className="space-y-4">
          {/* <label className="flex items-center gap-2 text-xs text-slate-300 font-bold">
            <input
              type="checkbox"
              checked={usePhotoBg}
              onChange={(e) => setUsePhotoBg(e.target.checked)}
            />
            Usar foto como fundo
          </label> */}

          {dataUrl ? (
            <img src={dataUrl} className="w-full rounded-xl border border-white/10" />
          ) : (
            <div className="text-slate-400 text-sm">Gerando preview...</div>
          )}

          <button
            onClick={download}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl uppercase tracking-widest text-xs"
          >
            Baixar PNG (alta qualidade)
          </button>
        </div>
      )}
    </Modal>
  );
}
