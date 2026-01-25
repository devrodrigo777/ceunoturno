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
  onPreviewOpen: () => void;

  SKY_W: number;
  SKY_H: number;

  // STARMAP
  // Quadro estelar
  starmapEnabled: boolean;
  setStarmapEnabled: (v: boolean) => void;

  starmapTitle: string;
  setStarmapTitle: (v: string) => void;

  locationQuery: string;
  setLocationQuery: (v: string) => void;

  locationResults: Array<{ id: number; label: string; lat: number; lng: number }>;
  locationLoading: boolean;

  selectedLocation: { id: number; label: string; lat: number; lng: number } | null;
  setSelectedLocation: (v: { id: number; label: string; lat: number; lng: number } | null) => void;

  eventDate: string;
  setEventDate: (v: string) => void;

  eventTime: string;
  setEventTime: (v: string) => void;

  hideTime: boolean;
  setHideTime: (v: boolean) => void;

  defaultUserName: string;
  user: any;
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
  onPreviewOpen,
  SKY_W,
  SKY_H,
  starmapEnabled,
  setStarmapEnabled,
  starmapTitle,
  setStarmapTitle,
  locationQuery,
  setLocationQuery,
  locationResults,
  locationLoading,
  selectedLocation,
  setSelectedLocation,
  eventDate,
  setEventDate,
  eventTime,
  setEventTime,
  hideTime,
  setHideTime,
  defaultUserName,
  user
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  


  useEffect(() => {
    if (isOpen){

      

      setStep(1);
      setType("star");
      setColor(ASTRO_COLORS[0]);
      setMsg("");

      setStarmapEnabled(false);
      setStarmapTitle(defaultUserName);

      setLocationQuery("");
      setSelectedLocation(null);

      setEventDate("");
      setEventTime("");
      setHideTime(false);
      setIsLocationOpen(false);
    }
  }, [isOpen, defaultUserName]);

  

  useEffect(() => {
    if (!starmapEnabled) {
      setIsLocationOpen(false);
    }
  }, [starmapEnabled]);
  
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
                    <i className="fa-solid fa-bolt"></i> {quote.type_prices[t]}
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
                    <div className="text-white text-sm font-black">
                      {ASTRO_AREAS[quote.area] || "Desconhecido"}
                      <p className="text-[10px] text-yellow-400">
                        {quote.base_price} <i className="fa-solid fa-star"></i>
                      </p>
                    </div>
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
                maxLength={300}
                value={msg.replace(/\n{3,}/g, "\n\n")}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Qual lembrança, promessa, objetivo, comemoração ou homenagem vai brilhar a partir de agora?"
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-sm h-24 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
              <span className="block text-slate-500 text-[10px] font-black uppercase mb-2">
                { 300 - msg.length } CARACTERES RESTANTES.
              </span>
            </div>

            {/* QUADRO ESTELAR */}
<div className="pt-4 border-t border-white10 space-y-3">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-slate-200 font-black uppercase tracking-widest text-10px">Quadro estelar</p>
      <p className="text-slate-500 text-xs">Gere um mapa real com base em local e data.</p>
    </div>

    <button
      type="button"
      onClick={() => { setStarmapEnabled(!starmapEnabled); }}
      className={[
        "px-4 py-2 rounded-xl border font-black uppercase tracking-widest text-10px transition",
        starmapEnabled
          ? "bg-indigo-600 border-indigo-40030 text-white"
          : "bg-slate-800 border-white10 text-slate-300 hover:bg-slate-700",
      ].join(" ")}
    >
      {starmapEnabled ? (<><i className="fa-solid fa-chevron-up mr-2"></i> Não</>) : (<><i className="fa-solid fa-chevron-down mr-2"></i> Sim</>)}
    </button>
  </div>

  {starmapEnabled && (
    <div className="space-y-3">
      {/* Título */}
      <div>
        <label className="block text-slate-500 text-10px font-black uppercase mb-2">
          Título do quadro
        </label>
        <input
          value={starmapTitle ?? ""}
          onChange={(e) => setStarmapTitle(e.target.value)}
          maxLength={60}
          className="w-full bg-slate-900 border border-white10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Ex: Nosso primeiro beijo"
        />
      </div>

      {/* Local (autocomplete) */}
      <div className="relative">
        <label className="block text-slate-500 text-10px font-black uppercase mb-2">
          Local do evento
        </label>

        <input
          value={locationQuery ?? ""}
          onFocus={() => setIsLocationOpen(true)}
          onChange={(e) => {
            setLocationQuery(e.target.value);
            setIsLocationOpen(true);
          }}
          onBlur={() => {
            // pequeno delay pra permitir clique no item do dropdown
            window.setTimeout(() => setIsLocationOpen(false), 150);
          }}
          className="w-full bg-slate-900 border border-white10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Digite uma cidade, estado ou país..."
        />

        {locationLoading && (
          <div className="text-10px text-slate-500 font-bold uppercase tracking-widest mt-2">
            Buscando...
          </div>
        )}

        {isLocationOpen && !!locationResults.length && locationQuery.trim().length >= 3 && (
          <div className="absolute z-50 mt-2 w-full bg-slate-950 border border-white10 rounded-xl overflow-hidden shadow-2xl">
            {locationResults.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSelectedLocation(r);
                  setLocationQuery(r.label);
                  setIsLocationOpen(false);
                }}
                className={[
                  "w-full text-left px-4 py-3 text-sm border-b border-white5 hover:bg-white5 transition",
                  selectedLocation?.id === r.id ? "bg-indigo-60020 text-white" : "text-slate-200",
                ].join(" ")}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {selectedLocation && (
            <div className="mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Selecionado: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </div>
          )}
        </div>

        {/* Data / Hora */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-500 text-10px font-black uppercase mb-2">
              Data
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-slate-900 border border-white10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 text-10px font-black uppercase mb-2">
              Hora
            </label>
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              disabled={hideTime}
              className="w-full bg-slate-900 border border-white10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Hide time */}
        <label className="flex items-center gap-2 text-xs text-slate-300 font-bold">
          <input
            type="checkbox"
            checked={hideTime}
            onChange={(e) => setHideTime(e.target.checked)}
          />
          Não mostrar a hora
        </label>
      </div>
    )}
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

            <div className="flex grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={onPreviewOpen}
                disabled={!pendingCoords}
                className={`${starmapEnabled ? "col-span-1" : "col-span-2"} w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest border border-white/10 text-[10px]`}
              >
                <i className="fa-solid fa-eye mr-1"></i> Prévia da Mensagem
              </button>
              {starmapEnabled && (
                <button
                  type="button"
                  // onClick={onOpenPreview}
                  // disabled={!pendingCoords}
                  className="col-span-1 w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest border border-white/10 text-[10px]"
                >
                  <i className="fa-solid fa-star mr-1"></i> Prévia do Quadro
                </button>
              )}
              
            </div>
          </div>
          </>
        )}
        </>
      )}
    </Modal>
  );
};

export default PurchaseModal;
