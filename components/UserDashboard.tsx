import React, { useState, useEffect } from 'react';
import RechargeModal from './RechargeModal';
import { useSession } from '@/hooks/useSession';
import CometaTimer from './CometaTimer';


interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
  credits: number;
  myAstros: any[];
  onLogout: () => void;
  onFocusAstro: (x: number, y: number) => void;
  onAbout: () => void;
  onTerms: () => void;
  onRecharge: () => void;
  onReferral: () => void;
}

const UserDashboard: React.FC<DashboardProps> = ({ 
  isOpen, onClose, user, profile, credits, myAstros, onAbout, onLogout, onFocusAstro, onTerms, onRecharge, onReferral
}) => {

  // console.log(user);
  return (
    <>
      {/* Overlay para fechar ao clicar fora */}
      {isOpen && (
        <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-transform duration-500 ease-out`} onClick={onClose} />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-slate-950/90 border-l border-white/10 backdrop-blur-2xl z-[101] transition-transform duration-500 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="p-6 h-full flex flex-col">
          {/* Header do Perfil */}
          <div className="flex items-center gap-4 mb-8">
            <img
              src={profile?.avatar_url || user.user_metadata.avatar_url}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== "./unknown.png") img.src = "./unknown.png";
              }}
              className="w-12 h-12 rounded-xl border-2 border-indigo-500"
              alt="Avatar"
              />
            <div>
              <h3 className="text-white font-black text-sm uppercase tracking-tighter">{profile?.full_name || user?.user_metadata?.full_name || "Desconhecido"}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Viajante Estelar</p>
            </div>
            <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Card de Créditos */}
          <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-4 mb-8 flex items-center justify-between">
            <div>
              <span className="block text-[8px] text-indigo-300 font-black uppercase tracking-[0.2em] mb-1">Saldo Disponível</span>
              <span className="text-2xl text-yellow-400 font-black"><i className="fa-solid fa-bolt"></i> {credits}</span>
            </div>
            <button className="bg-indigo-500 hover:bg-indigo-400 text-white text-[9px] font-black px-3 py-2 rounded-lg transition-all active:scale-95"
              onClick={onRecharge}>
              RECARREGAR
            </button>
          </div>

          {/* Lista de Meus Astros */}
          <div className="flex-1 overflow-y-auto">
            <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-4">Meus Registros ({myAstros.length})</h4>
            
            <div className="space-y-3">
              {myAstros.length === 0 ? (
                <p className="text-xs text-slate-600 italic">Você ainda não reivindicou astros no mapa estelar.</p>
              ) : (
                myAstros.map(astro => (
                  <div key={astro.id} className="group bg-white/5 border border-white/5 hover:border-indigo-500/50 p-3 rounded-xl transition-all cursor-pointer" onClick={() => onFocusAstro(astro.x, astro.y)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: astro.color }} />
                        <span className="text-[10px] text-white font-bold uppercase tracking-tighter">{astro.type}</span>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-mono italic">{astro.coordinate}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">"{astro.message}"</p>
                    <div className="flex items-center gap-3 text-[9px] text-slate-500 font-bold uppercase">
                       <span><i className="fa-solid fa-bolt-lightning text-yellow-500 mr-1"></i> {astro.pulses || 0} Pulsos</span>
                       <span className="group-hover:text-indigo-400 transition-colors"><i className="fa-solid fa-location-crosshairs mr-1"></i> Localizar</span>
                    </div>
                  </div>
                ))
              )}

            </div>
          </div>

          {/* Saldo JOGO (Cometa) */}
        <div className="font-black text-yellow-400">
          Poeiras Estelares: {profile?.total_referral_comission?.toFixed(0) ?? 0}
        </div>

        {/* Cometa Timer */}
        <CometaTimer 
          userBalance={profile?.total_referral_comission ?? 0} 
        />

          {/* Footer - Sobre e Logout */}
          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
            <button onClick={onAbout} className="w-full text-left text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
              <i className="fa-solid fa-circle-info"></i> Sobre o Projeto
            </button>
            <button onClick={onTerms} className="w-full text-left text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
              <i className="fa-solid fa-circle-info"></i> Termos  de Uso
            </button>
            <button onClick={onReferral} className="w-full text-left text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
              <i className="fa-solid fa-users"></i> Ganhe Dinheiro
            </button>
            <button onClick={onLogout} className="w-full text-left text-red-400/70 hover:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors">
              <i className="fa-solid fa-right-from-bracket"></i> Encerrar Sessão
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default UserDashboard;