import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import type { Astro } from "@/types";
import { renderStarPoster } from "@/utils/renderStarPoster";
import { renderCompassPoster } from "@/utils/renderCompassPoster";
import { formatDate } from "@/utils/formatDate";

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
  const hasPhoto = !!astro?.image_path || !!astro?.image_url;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen || !astro) return;
    let cancelled = false;

    setBusy(true);
    // (async () => {
    //   const canvas = await renderStarPoster(astro, {
    //     sizePx: 2000, // preview rápido
    //     usePhotoBg,
    //     title: "ONDE TUDO COMEÇOU",
    //     subtitle: "Nosso primeiro beijo",
    //     footer: astro.coordinate ?? "",
    //     markAstro: true,
    //   });
    //   if (!cancelled) setDataUrl(canvas.toDataURL("image/png"));
    // })();
    console.log("changing...");
    (async () => {
      const canvas = await renderCompassPoster(astro, {
        templateSrc: "./compass.png",
        usePhotoBg,                 // agora é foto no fundo do slot
        photoOpacity: 0.3,
        starPosterSizePx: 2000,
        slot: {
          x: 415, y: 551, w: 1650, h: 1650, // TODO: coloque o slot real do centro
          shape: "circle",
        },
        //markAstro: true,
      });

      if (!cancelled) setDataUrl(canvas.toDataURL("image/png"));
      setBusy(false);
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
          {!busy && (
            <>
          {hasPhoto && (
            <label className="flex items-center gap-2 text-xs text-slate-300 font-bold">
              <input
                type="checkbox"
                checked={usePhotoBg}
                onChange={(e) => setUsePhotoBg(e.target.checked)}
              />
              Usar foto como fundo
            </label>
          )}


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
          </>
          )}
        </div>
      )}

      {busy && (
        <div className="w-full py-10 flex flex-col items-center justify-center gap-3 text-slate-300">
          <i className="fa-solid fa-circle-notch animate-spin text-indigo-400 text-2xl" />
          <div className="text-sm font-bold">Gerando mapa estelar...</div>
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
            Isso pode levar alguns segundos
          </div>
        </div>
      )}
    </Modal>
  );
}
