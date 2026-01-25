import React, { useMemo, useEffect, useState } from "react";
import Modal from "./Modal";
import { supabase } from "@/services/supabaseClient";
import { toast } from "sonner";
import { showPixLoadingToast } from "@/utils/toasts";
import { isValidCPF, formatCPF } from "@/utils/formatCpf";
import { User } from "@/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // opcional: fechar modal, toast etc.
  closeAllOverlays: () => void;
  closeTopupModal: () => void;
  user: any;
};

type ApiResp = {
  topup_id: string;
  amount_cents: number;
  credits: number;
  mp_payment_id?: string;
  mp_status?: string;
  pix?: {
    qr_code: string | null;
    qr_code_base64: string | null;
  };
};

const RechargeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  closeAllOverlays,
  closeTopOverlay,
  user,
}) => {
  const [amountCents, setAmountCents] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ApiResp | null>(null);
  const [error, setError] = useState<string>("");

  // Obrigatório ter CPF cadastrado para pagar com PIX
  const [cpfFilled, setCpfFilled] = useState(false);
  const [cpfError, setCpfError] = useState(false);
  const [updatingCpf, setUpdatingCpf] = useState(false);
  const [cpf, setCpf] = useState("");

  const first_name = user?.user_metadata?.name.split(" ")[0] ?? "Viajante";

  const PIX_TTL_MS = 4 * 60 * 1000;
  const [pixExpiresAt, setPixExpiresAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);

  const amountBRL = useMemo(
    () => (amountCents / 100).toFixed(2),
    [amountCents],
  );

  const completeSignup = async () => {
    setUpdatingCpf(true);
    const aguardeToast = toast.loading("Atualizando cadastro...", {
      duration: 0,
    });

    try {
      if (!cpf || !isValidCPF(cpf)) {
        toast.error("CPF inválido");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "update-user-cpf",
        {
          body: { cpf },
        },
      );

      if (error) {
        toast.error("Erro ao atualizar CPF");
        return;
      }

      if (data?.updated) {
        toast.success("Cadastro atualizado com sucesso!");
        setCpfFilled(data.cpf_filled); // true
      } else {
        toast.warning("CPF não foi atualizado");
        setCpfFilled(false);
      }
    } catch (err) {
      toast.error("Erro inesperado");
    } finally {
      // closeAllOverlays();
      setUpdatingCpf(false);
      toast.dismiss(aguardeToast);
    }
  };

  const handleCPFChange = (value: string) => {
    const masked = formatCPF(value);
    setCpf(masked);

    const raw = masked.replace(/\D/g, "");
    setCpfError(raw.length === 11 && !isValidCPF(raw));
  };

  useEffect(() => {
    if (user && isValidCPF(user?.cpf ?? "")) {
      setCpfFilled(true);
      setCpf(user.user_metadata.cpf);
    }
  }, [user]);

  useEffect(() => {
    if (!pixExpiresAt) return;

    const tick = () => {
      const sec = Math.max(0, Math.ceil((pixExpiresAt - Date.now()) / 1000));
      setRemainingSec(sec);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [pixExpiresAt]);

  const isExpired = pixExpiresAt ? Date.now() >= pixExpiresAt : false;

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");

  useEffect(() => {
    if (!isOpen) return;

    setCpfFilled(false);
    setCpf("");
    // Estado inicial (o que você quiser como default)
    setAmountCents(2000);
    setLoading(false);
    setResp(null);
    setError("");
    setPixExpiresAt(Date.now() + PIX_TTL_MS);
  }, [isOpen]);

  /** Listener de payment */
  useEffect(() => {
    if (!resp?.topup_id) return;

    const toastId = toast.loading("Aguardando pagamento...");

    const channel = supabase
      .channel(`topup-${resp.topup_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mp_topups",
          filter: `id=eq.${resp.topup_id}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const amountCents = payload.new.amount_cents;
          toast.dismiss(toastId);

          if (newStatus === "approved") {
            toast.success(`Pagamento confirmado! ✨${amountCents} energias foram adicionadas.`);

            // opcional: fechar modal
            // onClose();

            // opcional: atualizar saldo do usuário
            // refetchUser();
            closeTopOverlay();

            supabase.removeChannel(channel);
          }

          if (newStatus === "failed" || newStatus === "cancelled") {
            toast.error("O pagamento não foi concluído.");
            supabase.removeChannel(channel);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resp?.topup_id]);


  async function handleCreateTopup() {
    setError("");
    setResp(null);
    setLoading(true);

    const toastId = showPixLoadingToast("Gerando Código PIX. Aguarde...");

    try {
      // Chamada recomendada: supabase.functions.invoke (já manda Authorization/apikey)
      const { data, error } = await supabase.functions.invoke<ApiResp>(
        "mp-create-topup",
        {
          body: { amount_cents: amountCents },
        },
      );

      toast.dismiss(toastId);
      if (error) toast.error(error.message);
      if (!data) toast.error("Resposta vazia do procedimento.");

      setPixExpiresAt(Date.now() + PIX_TTL_MS);

      setResp(data);

      

      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar recarga.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado para a area de transferência.");
    } catch {
      // fallback: sem toast aqui, mas você pode integrar sonner depois
      console.error("Erro ao copiar para a area de transferência.");
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cpfFilled ? "Recarregar energias" : "Complete seu cadastro"}
    >
      <div className="space-y-4">
        {cpfFilled && (
          <>
            {!resp && (
              <>
                <p className="text-slate-400 text-sm">
                  Selecione um valor e gere o Pix para recarregar suas Energias
                  Estelares.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { cents: 1000, label: "R$ 10", credits: 600 },
                    { cents: 2000, label: "R$ 20", credits: 1200, bonus: 1200 },
                    { cents: 5000, label: "R$ 50", credits: 4000, bonus: 700 },
                  ].map((o) => (
                    <button
                      key={o.cents}
                      type="button"
                      disabled={loading}
                      onClick={() => setAmountCents(o.cents)}
                      style={{ pointerEvents: loading ? "none" : "auto" }}
                      className={[
                        "py-3 rounded-xl border disabled:opacity-60 border-white/10 font-black transition flex flex-col items-center justify-center",
                        amountCents === o.cents
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700",
                      ].join(" ")}
                    >
                      <span className="text-xs uppercase tracking-widest">
                        {o.label}
                      </span>

                      <span className="text-[10px] text-slate-300/80 font-black uppercase tracking-widest mt-1">
                        +{o.credits} energias
                      </span>
                      {o.bonus && (
                        <span className="text-[10px] text-yellow-300/80 font-black uppercase tracking-widest mt-1">
                          +{o.bonus} bônus
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCreateTopup}
                  disabled={loading}
                  className="w-full bg-yellow-400 text-slate-950 font-black py-4 rounded-xl shadow-xl transition-all uppercase tracking-widest text-xs disabled:opacity-60"
                >
                  {loading
                    ? "Gerando Pix..."
                    : `Gerar Pix (R$ ${amountBRL.toString().replace(".", ",")})`}
                </button>

                <div
                  style={{
                    pointerEvents: loading ? "none" : "auto",
                    opacity: loading ? 0.5 : 1,
                  }}
                  className="mt-4 rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-3"
                >
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                    Tabela de custos (créditos)
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-3 leading-relaxed">
                    Total do astro = preço base da área + tipo.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Áreas */}
                    <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3">
                      <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-2">
                        Preço base por área
                      </p>

                      <div className="space-y-1 text-[11px] text-slate-200 font-bold">
                        <div className="flex items-center justify-between">
                          <span>
                            Zênite{" "}
                            <span className="text-slate-500">(Norte)</span>
                          </span>
                          <span className="text-yellow-400 font-black">
                            500{" "}
                            <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>
                            Nadir <span className="text-slate-500">(Sul)</span>
                          </span>
                          <span className="text-yellow-400 font-black">
                            100{" "}
                            <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Horizonte Leste</span>
                          <span className="text-yellow-400 font-black">
                            350{" "}
                            <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Horizonte Oeste</span>
                          <span className="text-yellow-400 font-black">
                            350{" "}
                            <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>
                            Horizonte{" "}
                            <span className="text-slate-500">(Equador)</span>
                          </span>
                          <span className="text-yellow-400 font-black">
                            700{" "}
                            <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tipos */}
                    <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3">
                      <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-2">
                        Preço por tipo
                      </p>

                      <div className="space-y-1 text-[11px] text-slate-200 font-bold">
                        <div className="flex items-center justify-between">
                          <span>Estrela</span>
                          <span className="text-yellow-400 font-black">
                            50{" "}
                            <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Planeta</span>
                          <span className="text-yellow-400 font-black">
                            +300{" "}
                            <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Nebulosa</span>
                          <span className="text-yellow-400 font-black">
                            +700{" "}
                            <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pulsar */}
                    <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3">
                      <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-2">
                        Interação
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-200 font-bold">
                        <span>Gerar Pôster Estelar</span>
                        <span className="text-yellow-400 font-black">
                          1000{" "}
                          <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-200 font-bold">
                        <span>Pulsar</span>
                        <span className="text-yellow-400 font-black">
                          30{" "}
                          <i className="fa-solid fa-star text-[10px] text-yellow-400"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {!cpfFilled && (
          <>
            <p className="text-slate-100 font-black text-xs uppercase text-center tracking-widest my-0">
              {first_name},
            </p>
            <p className="text-slate-400 font-black text-xs uppercase text-center tracking-widest mt-1">
              nós usamos o Mercado Pago para cobranças do{" "}
              <i>
                <span class="text-blue-400">Céu</span>
                <span class="text-yellow-400">Noturno</span>
              </i>
            </p>
            <p className="text-slate-400 font-black text-xs uppercase text-center tracking-widest mt-1">
              E gerar pagamentos via PIX, é obrigatório a identificação do
              pagador.
            </p>
            <div className="space-y-3 bg-slate-800/60 border border-white/10 rounded-xl p-4">
              <p className="text-slate-300 font-black text-xs uppercase text-center tracking-widest">
                Informe seu CPF
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  disabled={updatingCpf}
                  value={cpf}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  className="text-white bg-slate-900/60 border border-white/10 rounded-xl p-3"
                />

                <button
                  onClick={completeSignup}
                  className={`bg-indigo-500/30 border border-indigo-500/30 text-indigo-200 disabled:text-indigo-400 disabled:opacity-70 rounded-xl p-3 disabled:cursor-not-allowed disabled:bg-indigo-500/30 disabled:border-indigo-500/30 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white transition-colors`}
                  disabled={!isValidCPF(cpf) || updatingCpf}
                >
                  Confirmar
                </button>
              </div>
              {cpfError && (
                <p className="text-red-400 font-black text-xs uppercase text-center tracking-widest mt-1">
                  CPF inválido. Tente novamente.
                </p>
              )}
            </div>
            <p className="text-slate-400 font-black text-xs uppercase text-center tracking-widest mt-1">
              Após completar seu cadastro, esta tela não será mais exibida.
            </p>
          </>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {resp?.pix?.qr_code && (
          <div className="space-y-3 bg-slate-800/60 border border-white/10 rounded-xl p-4">
            <p className="text-slate-300 font-black text-xs uppercase text-center tracking-widest">
              Pagamento via Pix
            </p>

            {/* QR CODE */}
            {resp?.pix?.qr_code_base64 ? (
              <>
                <div className="w-full flex items-center justify-center">
                  <div className="bg-white rounded-2xl p-3 shadow-xl">
                    <img
                      src={`data:image/png;base64,${resp.pix.qr_code_base64}`}
                      alt="QR Code Pix"
                      className="w-56 h-56"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-sm font-black uppercase tracking-widest text-slate-400">
                    Expira em
                  </span>

                  <span
                    className={`ml-1 text-sm font-black ${isExpired ? "text-red-400" : "text-yellow-300"}`}
                  >
                    {isExpired ? "00:00" : `${mm}:${ss}`}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400">
                QR Code indisponível. Use o copia e cola abaixo.
              </p>
            )}

            {/* Linha Horizontal */}
            <div className="border-b border-white/10"></div>

            {/* COPIA E COLA EM 1 LINHA */}
            <div className="space-y-2">
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                Pix copia e cola
              </p>

              <div className="flex gap-1">
                <input
                  readOnly
                  value={resp.pix.qr_code ?? ""}
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-1 py-2 text-slate-400 text-xs outline-none h-10"
                />
                <button
                  type="button"
                  className="bg-slate-700 hover:bg-slate-600 text-white font-black px-4 rounded-xl text-xs uppercase tracking-widest h-10"
                  onClick={() => handleCopy(resp.pix!.qr_code!)}
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Linha Horizontal */}
            <div className="border-b border-white/10"></div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest border border-white/10"
                onClick={onClose}
              >
                Fechar
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Após o pagamento, o saldo atualiza automaticamente.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RechargeModal;
