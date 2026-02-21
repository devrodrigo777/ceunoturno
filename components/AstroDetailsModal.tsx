import React, { useState, useEffect, useReducer } from "react";
import Modal from "./Modal";
import { Astro } from "../types";
import { formatAstroDate } from "@/utils/formatDate";

type Props = {
  selectedAstro: Astro | null;
  onClose: () => void;

  onPulse: () => void;
  onShare: () => void;
  onPoster: () => void;

  isPulsing: boolean;
  isLogged: boolean;
  isAstroModalOpen: boolean;

  session: any;
};

const AstroDetailsModal: React.FC<Props> = ({
  selectedAstro,
  onClose,
  onPulse,
  onShare,
  onPoster,
  isPulsing,
  isLogged,
  isAstroModalOpen,
  session,
}) => {
const [imgLoaded, setImgLoaded] = useState(false);
const [isOwner, setIsOwner] = useState(false);
const [fontSize, setFontSize] = useState(18);
const [messageText, setMessageText] = useState("");
const [, forceUpdate] = useReducer(x => x + 1, 0);

useEffect(() => {

  setMessageText(selectedAstro?.message || "");

  setTimeout(() => {
    forceUpdate();
  }, 1000);

  if (selectedAstro?.user_id === session?.user.id) {
    setIsOwner(true);
  } else {
    setIsOwner(false);
  }
}, [selectedAstro, session]);

const min_fontSize = 18;
const max_fontSize = 24;

useEffect(() => {
  //console.log(selectedAstro?.message?.length);
  if (selectedAstro?.message?.length < 30) {
    setFontSize(max_fontSize);
  } else {
    setFontSize(min_fontSize);
  }
}, [selectedAstro?.message, setFontSize]);

useEffect(() => {
  // reseta quando troca de astro (senão fica "loaded" do anterior)
  setImgLoaded(false);
}, [selectedAstro?.image_path]);

  return (

    <Modal isOpen={isAstroModalOpen} onClose={() => {onClose(); setImgLoaded(false); selectedAstro = null; setIsOwner(false); setMessageText(""); forceUpdate();}} title="Explorando">
      {!!selectedAstro && (
        <div className="animate-entrance backdrop-blur-sm text-center py-6">
          <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center relative">
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

          {selectedAstro.image_path && (
            <div className="relative justify-center flex mt-6 w-full min-h-[40vh] max-h-[70vh] rounded-2xl border border-white/10 overflow-hidden bg-slate-900">
              {/* skeleton */}
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800 to-slate-900" />
              )}

              <img
                src={selectedAstro.image_path}
                alt="Imagem do astro"
                loading="lazy"
                className={[
                  "absolute inset-0 max-h-[70vh] min-h-[40vh] w-full max-w-full object-cover blur-xl scale-110 transition-opacity duration-300",
                  imgLoaded ? "opacity-100" : "opacity-0",
                ].join(" ")}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)} // para não ficar skeleton infinito
              />

              <img
                src={selectedAstro.image_path}
                alt="Imagem do astro"
                loading="lazy"
                className={[
                  "relative z-10 inset-0 max-h-[70vh] min-h-[40vh] w-auto max-w-full object-contain transition-opacity duration-300",
                  imgLoaded ? "opacity-100" : "opacity-0",
                ].join(" ")}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)} // para não ficar skeleton infinito
              />
            </div>
          )}


          <div className="relative mt-6 px-6">
            {/* Aspas decorativas */}
            <span className="absolute -top-8  left-0 text-[180px] leading-none text-white/5 font-serif select-none">
              “
            </span>

            <p
              className="relative md:text-2xl xs:text-3xl text-xl mt-4 text-white font-serif italic leading-relaxed text-center"
              style={{ wordBreak: "break-word" }}
              >
              {messageText}
            </p>

             <span className="absolute -top-8 right-0 text-[180px] leading-none text-white/5 font-serif select-none">
              ”
            </span>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 space-y-1">
            <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-[0.2em]">
              {selectedAstro.coordinate}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Por {selectedAstro.user_name}
            </p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              {formatAstroDate(selectedAstro.created_at)}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-10 gap-3">
            <button
              onClick={onPulse}
              disabled={!isLogged || isPulsing}
              className="col-span-4 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              {isPulsing ? "Pulsando" : (<>Pulsar <span className="text-black">30 <i className="fa-solid fa-bolt"></i></span></>)}
            </button>

            <button
              onClick={onShare}
              className="col-span-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-share-nodes"></i> Compartilhar
            </button>

            {isLogged && (
              <p className="text-xs col-span-10 text-slate-500 font-bold uppercase tracking-widest">
                Pulsar custa 30 Energias Estelares.
              </p>
            )}

            {/* LINHA HORIZONTAL */}
            <div className="col-span-10 h-px bg-white/10"></div>

            {isOwner && (
              selectedAstro.poster_enabled ? (
                <button
                  onClick={onPoster}
                  className="animate-blinkScale col-span-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-star"></i> Abrir Pôster Estelar
                </button>
              ) : (
                <button
                  onClick={onPoster}
                  className="animate-blinkScale col-span-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-star"></i> Obter Pôster Estelar{" "}
                  <span className="text-yellow-400">
                    1000 <i className="fa-solid fa-bolt"></i>
                  </span>
                </button>
              )
            )}

          </div>

          

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
