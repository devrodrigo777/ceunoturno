import React from 'react';
import { useEffect, useState } from 'react';
import Modal from './Modal';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';
import { ref } from 'process';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  balance: number;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose, user, balance }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saques, setSaques] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  const fetchSaques = async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Erro ao buscar saques:", error);
      } else {
        setSaques(data);
      }
    };

  useEffect(() => {
    if (!user) return;
    const fetchReferrals = async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Erro ao buscar indicacoes:", error);
      } else {
        setReferrals(data);
      }
    };
    fetchReferrals();
  }, [user]);


  useEffect(() => {
    if (!user) return;
    fetchSaques();
  }, [user]);

  if (!isOpen || !user) return null;

  const referralLink = `${window.location.origin}?ref=${user.id}`;


  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Link de indicação copiado!');
  };

  const handleWithdraw = () => {
    if (balance < 30) {
      toast.error("Você precisa ter pelo menos R$ 30,00 em saldo para solicitar um saque!");
    } else {
      setIsConfirmOpen(true);
    }
  };

  const confirmWithdraw = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('efetua-saque');
      if (error) throw error;
      
      //console.log("Saque sucesso: "  + data);
      
      await fetchSaques(); // Atualiza a lista de saques após solicitar
      toast.success("Solicitação de saque enviada com sucesso!");
      setIsConfirmOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao solicitar saque.");
    } finally {
      setLoading(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Ganhe Dinheiro">
      <div className="space-y-4 text-center">

        {/* Espaço para exibição do saldo das indicações com um enfeito */}
        <div className="bg-slate-800 border border-white/10 rounded-xl p-4 flex gap-3">
          <div className="flex-1 bg-transparent text-slate-300 text-sm outline-none">
            <p className="text-slate-400 text-sm text-left">Seu saldo atual:</p>
            <p className="text-slate-400 text-sm text-left text-green-400">R$ {balance.toFixed(2) || "0,00"}</p>
          </div>
          <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors" onClick={handleWithdraw}>
            SACAR
          </button>
        </div>
        <div className="text-slate-400 text-xs text-center">Ganhe dinheiro com o <strong>Asteroider</strong> ou com indicações!</div>
        <div className="text-slate-400 text-xs italic text-center">Valor mínimo para solicitação de saque: <strong>R$ 30,00</strong></div>
        <div className="text-slate-400 text-xs italic text-center">O valor solicitado será enviado para o seu CPF ou o E-mail cadastrado desta conta.</div>

          {/* Horizontal border line */}
        <div className="w-full h-px bg-white/10"></div>

        <div className="bg-slate-800 border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 bg-transparent text-slate-300 text-sm outline-none"
          />
          <button
            onClick={handleCopy}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2 rounded-lg text-xs uppercase tracking-widest"
          >
            Copiar
          </button>
        </div>

        {/* Horizontal border line */}
        <div className="w-full h-px bg-white/10"></div>

        <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-gift text-yellow-400 text-2xl"></i>
        </div>
        <h3 className="text-white font-black text-lg">Indique e Ganhe Dinheiro!</h3>
        <p className="text-slate-400 text-sm">
          Compartilhe seu link de indicação. Para cada pessoa que se cadastrar e fizer a primeira compra de poeiras estelares, você ganha <strong className="text-yellow-400">30% do valor da compra</strong>!
        </p>
        
        {/* Horizontal border line */}
        <div className="w-full h-px bg-white/10"></div>

        <p className="text-slate-400 text-sm text-center">Seus indicados</p>

        <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left">
            <thead>
                <tr>
                <th className="text-slate-400 text-sm">Nome</th>
                <th className="text-slate-400 text-sm text-right">Comissão</th>
                </tr>
            </thead>
            <tbody>
                {referrals.map((referral: any) => (
                <tr key={referral.id}>
                    <td className="text-slate-400 text-sm">{referral.full_name}</td>
                    <td className="text-slate-400 text-sm text-right text-green-400">+R$ {referral.commission.toFixed(2)}</td>
                </tr>
                ))}

                {referrals.length === 0 && (
                <tr>
                    <td colSpan="3" className="text-slate-400 text-sm text-center italic">Você ainda não possui nenhum indicado.</td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
        
        {/* Horizontal border line */}
        <div className="w-full h-px bg-white/10"></div>

        <p className="text-slate-400 text-sm text-center">Solicitações de Saque</p>

        <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left">
            <thead>
                <tr>
                <th className="text-slate-400 text-sm">Valor</th>
                <th className="text-slate-400 text-sm text-right">Status</th>
                </tr>
            </thead>
            <tbody>
                {saques.map((saque: any) => (
                <tr key={saque.id}>
                    <td className="text-slate-400 text-sm">{saque.amount.toFixed(2)}</td>
                    {saque.status === 'pending' ? (
                      <td className="text-slate-400 text-sm text-right text-yellow-400">Pendente</td>
                    ) : (
                      <td className="text-slate-400 text-sm text-right text-green-400">Pago</td>
                    )}
                </tr>
                ))}

                {saques.length === 0 && (
                <tr>
                    <td colSpan="3" className="text-slate-400 text-sm text-center italic">Nenhuma solicitação de saque ainda.</td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </Modal>

    {isConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-white font-bold text-lg mb-2">Confirmar Saque</h3>
            <p className="text-slate-300 text-sm mb-6">
              Deseja mesmo sacar o valor de <strong className="text-green-400">R$ {balance.toFixed(2)}</strong>?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors border border-white/5"
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmWithdraw}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-green-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                disabled={loading}
              >
                {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReferralModal;
