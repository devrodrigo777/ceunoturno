import { useEffect, useState } from "react"

export default function CometaPromo({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed) return

    const timer = setTimeout(() => {
      setVisible(true)
    }, 8000)

    return () => clearTimeout(timer)
  }, [dismissed])

  if (!visible || dismissed) return null

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="relative bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-xl rounded-2xl p-4 w-72 animate-fade-in">
        
        {/* Botão fechar */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          X
        </button>

        <div className="text-sm text-zinc-400 uppercase tracking-wider mb-1">
          ✨ Acesse os Cometas
        </div>

        <div className="text-zinc-200 text-sm leading-relaxed mb-3">
          Participe das decolagens cósmicas e multiplique seus saldos!
        </div>

        <button
          onClick={onClick}
          className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-sm py-2 rounded-lg"
        >
          Entrar agora
        </button>
      </div>
    </div>
  )
}