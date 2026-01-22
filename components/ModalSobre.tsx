import React, { useEffect } from 'react';
// import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalSobre: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center overflow-y-scroll justify-center p-4 bg-black/70 backdrop-blur-sm">
      {/* Container do Modal */}
      <div data-modal className="relative max-w-2xl w-full max-h-[85vh] bg-slate-900/80 border border-blue-500/30 p-8 rounded-2xl shadow-2xl backdrop-blur-md overflow-y-auto modal-content">
        
        {/* Detalhe decorativo: Brilho Estelar */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl"></div>
        
        {/* Botão Fechar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          {/* <X size={24} /> */}
          X
        </button>

        {/* Conteúdo */}
        <div className="relative z-10 space-y-6 text-slate-200">
          <header className="text-center">
            <h2 className="text-3xl font-light tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-100 uppercase">
              O Projeto Céu Noturno
            </h2>
            <div className="h-[1px] w-24 bg-blue-500/50 mx-auto mt-2"></div>
          </header>

          <section className="space-y-4 leading-relaxed font-light">
            <p className="text-sm text-slate-400">
              O <strong>Céu Noturno</strong> é sobre um mapa estelar interativo e colaborativo. Cada astro tem uma mensagem, uma promessa, uma lembrança ou um desejo, tornando-se uma lembrança eterna no nosso universo digital.
            </p>
            
            <div>
              <h3 className="text-blue-400 font-medium mb-1 italic">Qual foi a inspiração?</h3>
              <p className="text-sm text-slate-400">
                Inspirado na imensidão do cosmos e na vontade humana de deixar uma marca. Queríamos criar um lugar onde mensagens, nomes e datas pudessem brilhar para sempre, longe do ruído das redes sociais tradicionais. É uma cápsula do tempo visual.
              </p>
            </div>

            <div>
              <h3 className="text-blue-400 font-medium mb-1 italic">Por que vale a pena?</h3>
              <p className="text-sm text-slate-400">
                Aqui, cada astro é um registro eterno: uma frase, um nome, uma data, uma intenção. Em vez de postar para “performar” por alguns minutos, você marca um ponto no mapa e transforma aquilo em algo que pode ser revisitado — por você, por alguém que recebeu o link, ou por quem estiver explorando o céu.
              </p>
              <p className="text-sm text-slate-400 mt-2">
                <strong class="font-weight-900 text-slate-200">Eternize momentos:</strong> aniversários, homenagens, conquistas, despedidas, promessas e recomeços ficam guardados de forma simples e bonita.
              </p>
              <p className="text-sm text-slate-400 mt-2">
                <strong class="font-weight-900 text-slate-200">Compartilhe de um jeito especial:</strong> mandar um link de um astro é como entregar uma cápsula do tempo — pessoal, direto e memorável.
              </p>
              <p className="text-sm text-slate-400 mt-2">
                <strong class="font-weight-900 text-slate-200">Inspire-se:</strong> ver mensagens de outras pessoas transforma o mapa em um mosaico humano: milhares de pequenas histórias brilhando juntas.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-widest text-center">
                Feito com ❤ por <span className="text-blue-300"><a href="https://linkedin.com/in/RodrigoLCA">RodrigoLCA
                    <i className="fa-brands fa-linkedin ml-1"></i>
                    </a></span>
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-widest text-center">
                © 2026</p>
            </div>
          </section>

          <footer className="flex justify-center pt-4">
            <button 
              onClick={onClose}
              className="px-8 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded-full text-blue-100 transition-all duration-300 active:scale-95"
            >
              Voltar ao Mapa
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ModalSobre;