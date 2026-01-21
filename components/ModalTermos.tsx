import React from 'react';
// import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalTermos: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    
  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        {/* Container do Modal */}
        <div className="relative max-w-2xl w-full max-h-[85vh] bg-slate-900/80 border border-blue-500/30 rounded-2xl shadow-2xl backdrop-blur-md overflow-y-auto">
          
          {/* Detalhe decorativo */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-20"
          >
            X
          </button>

          {/* Conteúdo em grid: Header fixo + Body rolável + Footer fixo */}
          <div className="relative z-10 h-full grid grid-rows-[auto,1fr,auto]">

            {/* Header */}
            <header className="text-center px-8 pt-8 pb-4">
              <h2 className="text-3xl font-light tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-100 uppercase">
                Termos de Uso
              </h2>
              <div className="h-[1px] w-24 bg-blue-500/50 mx-auto mt-2"></div>
            </header>

            {/* Body (SCROLL) */}
            <div className="px-8 pb-6 overflow-y-auto overscroll-contain">
              <section className="space-y-4 leading-relaxed font-light text-slate-200">
                <p><strong>Última atualização:</strong> 21/01/2026</p> <p>Estes Termos de Uso (“<strong>Termos</strong>”) regulam o acesso e uso da plataforma <strong>Céu Noturno</strong> (“Plataforma”), um mapa estelar interativo e colaborativo onde usuários podem registrar (“reivindicar”) astros e interagir com registros existentes (“Serviço”). Ao criar uma conta, acessar ou utilizar o Serviço, você declara que leu, entendeu e concorda com estes Termos.</p> <p><strong>1. Definições</strong></p> <p>Para fins destes Termos:</p> <p><strong>Usuário:</strong> pessoa que acessa ou utiliza a Plataforma.</p> <p><strong>Conta:</strong> cadastro do Usuário (inclusive via login social).</p> <p><strong>Conteúdo:</strong> mensagens, nomes, textos, imagens (se aplicável) e quaisquer informações inseridas pelo Usuário na Plataforma.</p> <p><strong>Energia Estelar / Saldo:</strong> unidade virtual usada para acessar funcionalidades pagas/limitadas do Serviço (ex.: reivindicar astros, pulsar etc.), conforme regras exibidas na Plataforma.</p> <p><strong>2. Elegibilidade e Conta</strong></p> <p>2.1. Você declara ter capacidade legal para aceitar estes Termos e utilizar o Serviço.</p> <p>2.2. Você é responsável por manter a segurança da sua Conta e por todas as atividades realizadas a partir dela.</p> <p>2.3. A Plataforma pode suspender ou encerrar Contas em caso de suspeita de fraude, violação destes Termos ou uso indevido.</p> <p><strong>3. Descrição do Serviço</strong></p> <p>3.1. A Plataforma permite criar e visualizar registros em um mapa estelar digital, incluindo a publicação de mensagens associadas a astros.</p> <p>3.2. Algumas ações podem exigir uso de Energia Estelar/Saldo, com valores e regras informados no próprio aplicativo.</p> <p>3.3. A Plataforma pode alterar, atualizar, suspender ou descontinuar funcionalidades, parcial ou totalmente, a qualquer tempo, visando evolução do Serviço e segurança.</p> <p><strong>4. Conteúdo do Usuário e Licença</strong></p> <p>4.1. Você é o único responsável pelo Conteúdo que publica, incluindo sua veracidade, legalidade e eventuais direitos de terceiros.</p> <p>4.2. Ao publicar Conteúdo, você concede à Plataforma uma licença <strong>não exclusiva</strong>, <strong>mundial</strong>, <strong>gratuita</strong>, <strong>sublicenciável</strong> e <strong>transferível</strong> para hospedar, armazenar, reproduzir, exibir, distribuir e disponibilizar esse Conteúdo estritamente para operar, melhorar e divulgar o Serviço.</p> <p>4.3. Você concorda que o Conteúdo pode ser exibido publicamente para outros Usuários, pois a natureza do Serviço é colaborativa e pública.</p> <p>4.4. A Plataforma poderá remover ou restringir Conteúdo que viole estes Termos, a lei ou direitos de terceiros, mediante critérios razoáveis, sem obrigação de aviso prévio.</p> <p><strong>5. Regras de Conduta (Proibições)</strong></p> <p>Você concorda em <strong>não</strong>:</p> <p>5.1. Publicar Conteúdo ilegal, difamatório, discriminatório, violento, sexualmente explícito, que incite ódio, assédio ou ameaças.</p> <p>5.2. Publicar dados pessoais sensíveis de terceiros (doxxing) ou qualquer Conteúdo que viole privacidade.</p> <p>5.3. Usar a Plataforma para spam, golpes, phishing, engenharia social, ou tentativa de burlar mecanismos (ex.: limites de tempo/cooldown).</p> <p>5.4. Realizar engenharia reversa, explorar vulnerabilidades, automatizar ações sem autorização (bots) ou interferir na operação do Serviço.</p> <p>5.5. Violar direitos autorais, marcas, segredos comerciais ou outros direitos de propriedade intelectual.</p> <p><strong>6. Energia Estelar/Saldo, Compras e Regras</strong></p> <p>6.1. O Saldo pode ser obtido por compra, promoção, bônus ou outras formas indicadas na Plataforma.</p> <p>6.2. Saldo é uma unidade digital de uso no Serviço; não representa moeda eletrônica, conta bancária ou valor mobiliário.</p> <p>6.3. Salvo disposição legal em contrário, o Saldo: (i) não é reembolsável, (ii) não é transferível e (iii) não pode ser convertido em dinheiro.</p> <p>6.4. A Plataforma pode implementar limites de uso e intervalos mínimos entre ações (ex.: pulsar o mesmo astro a cada X minutos) para manter a integridade do sistema.</p> <p><strong>7. Moderação, Suspensão e Encerramento</strong></p> <p>7.1. A Plataforma pode suspender, limitar ou encerrar o acesso do Usuário, temporária ou definitivamente, em caso de: (i) violação destes Termos, (ii) suspeita de fraude/abuso, (iii) solicitação de autoridade competente, (iv) necessidade de segurança/estabilidade do Serviço.</p> <p>7.2. O Usuário pode solicitar encerramento de Conta por meio do canal: <strong>rodrigolca@gmail.com</strong>.</p> <p><strong>8. Propriedade Intelectual</strong></p> <p>8.1. A Plataforma, seu design, marca, software, interface, textos institucionais e recursos (exceto Conteúdo do Usuário) pertencem ao responsável indicado nestes Termos e são protegidos por leis de propriedade intelectual.</p> <p>8.2. Estes Termos não concedem ao Usuário qualquer direito de propriedade sobre a Plataforma.</p> <p><strong>9. Privacidade e Dados</strong></p> <p>9.1. O tratamento de dados pessoais é regido pela <strong>Política de Privacidade</strong> da Plataforma, disponível em: <strong>[INSERIR LINK]</strong>.</p> <p>9.2. Ao utilizar o Serviço, você concorda com a coleta e uso de dados conforme a Política de Privacidade, incluindo dados necessários para autenticação, antifraude, segurança e operação do Serviço.</p> <p><strong>10. Indisponibilidade e Isenção de Garantias</strong></p> <p>10.1. O Serviço é oferecido “<strong>no estado em que se encontra</strong>” e “<strong>conforme disponível</strong>”.</p> <p>10.2. A Plataforma não garante que o Serviço será ininterrupto, livre de erros ou que registros/conteúdos permanecerão disponíveis por tempo indeterminado.</p> <p>10.3. A Plataforma pode realizar manutenções, atualizações e alterações técnicas que impactem a disponibilidade.</p> <p><strong>11. Limitação de Responsabilidade</strong></p> <p>11.1. Na extensão máxima permitida pela lei, a Plataforma não será responsável por: (i) danos indiretos, lucros cessantes, perda de dados, interrupção do serviço; (ii) Conteúdo publicado por Usuários; (iii) links externos e serviços de terceiros integrados.</p> <p>11.2. Em qualquer hipótese, eventual responsabilidade total da Plataforma será limitada ao valor efetivamente pago pelo Usuário à Plataforma nos últimos <strong>[3/6/12]</strong> meses, se aplicável.</p> <p><strong>12. Alterações destes Termos</strong></p> <p>12.1. A Plataforma pode atualizar estes Termos periodicamente. A versão vigente será publicada com a data de “Última atualização”.</p> <p>12.2. O uso contínuo do Serviço após alterações indica aceitação dos novos Termos.</p> <p><strong>13. Lei Aplicável e Foro</strong></p> <p>13.1. Estes Termos são regidos pelas leis da República Federativa do Brasil.</p> <p>13.2. Fica eleito o foro da comarca de <strong>[CIDADE/UF]</strong>, com renúncia a qualquer outro, por mais privilegiado que seja, salvo disposições legais específicas aplicáveis ao consumidor.</p> <p><strong>14. Contato</strong></p> <p>Em caso de dúvidas, solicitações ou denúncias:</p> <p><strong>Responsável:</strong> Rodrigo Lopes</p> <p><strong>E-mail:</strong> <a href="mailto:rodrigolca@gmail.com">rodrigolca@gmail.com</a></p>
              </section>
            </div>

            {/* Footer */}
            <footer className="px-8 pb-6 pt-4 border-t border-white/5 flex justify-center">
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

export default ModalTermos;