import React from 'react';
import Modal from './Modal';
import { toast } from 'sonner';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const referralLink = `${window.location.origin}?ref=${user.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Link de indicação copiado!');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ganhe Dinheiro">
      <div className="space-y-4 text-center">

        {/* Espaço para exibição do saldo das indicações com um enfeito */}
        <div className="bg-slate-800 border border-white/10 rounded-xl p-4 flex gap-3">
          <div className="flex-1 bg-transparent text-slate-300 text-sm outline-none">
            <p className="text-slate-400 text-sm text-left">Seu saldo atual:</p>
            <p className="text-slate-400 text-sm text-left text-green-400">R$ 0,00</p>
          </div>
          <button className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors" onClick={() => {
            // if (referral?.amount < 30) {
              toast.error("Você precisa ter pelo menos R$ 30,00 em saldo para solicitar um saque!");
            // } else {
              // implementar a lógica de saque aqui
            // }
          }}>
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
                <th className="text-slate-400 text-sm">E-mail</th>
                <th className="text-slate-400 text-sm">Status</th>
                </tr>
            </thead>
            <tbody>
                {user?.referrals?.map((referral: any) => (
                <tr key={referral.id}>
                    <td className="text-slate-400 text-sm">{referral.name}</td>
                    <td className="text-slate-400 text-sm text-right">R$ {referral.amount}</td>
                </tr>
                ))}

                {/* {user?.referrals?.length === 0 && ( */}
                <tr>
                    <td colSpan="3" className="text-slate-400 text-sm text-center italic">Você ainda não possui nenhum indicado.</td>
                </tr>
                {/* )} */}
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
                <th className="text-slate-400 text-sm">Status</th>
                </tr>
            </thead>
            <tbody>
                {user?.referrals?.map((referral: any) => (
                <tr key={referral.id}>
                    <td className="text-slate-400 text-sm">{referral.name}</td>
                    <td className="text-slate-400 text-sm text-right">R$ {referral.amount}</td>
                </tr>
                ))}

                {/* {user?.referrals?.length === 0 && ( */}
                <tr>
                    <td colSpan="3" className="text-slate-400 text-sm text-center italic">Nenhuma solicitação de saque ainda.</td>
                </tr>
                {/* )} */}
            </tbody>
            </table>
        </div>
      </div>
    </Modal>
  );
};

export default ReferralModal;