import { CometaGame } from '@/hooks/useCometaRealtime'
import { useEffect, useRef, useCallback } from 'react'

interface Props {
  game: CometaGame | null
  userBalance: number
  onClose: () => void
  placeBet: (amount: number) => void
  betAmount: number
  setBetAmount: (amount: number) => void
}

export function CometaGameModal({ game, userBalance, onClose, placeBet, betAmount, setBetAmount }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Canvas Animation Aviator-style
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !game) return

    const ctx = canvas.getContext('2d')!
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    let rafId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Céu gradiente (seu style)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, '#0f172a')
      gradient.addColorStop(1, '#1e293b')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (game.status === 'flying' || game.status === 'crashed') {
        const progress = Math.min(game.multiplier / 20, 1)
        const cometX = canvas.width / 2
        const cometY = canvas.height * (1 - progress)
        
        // Rastro do cometa
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.5 * (1 - progress)})`
        ctx.lineWidth = 20 * progress
        ctx.beginPath()
        ctx.moveTo(cometX, canvas.height)
        ctx.lineTo(cometX, cometY)
        ctx.stroke()

        // Cometa principal
        ctx.fillStyle = '#facc15'
        ctx.shadowColor = '#facc15'
        ctx.shadowBlur = 30
        ctx.beginPath()
        ctx.arc(cometX, cometY, 8 + progress * 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Partículas
        for (let i = 0; i < 10; i++) {
          const px = cometX - 30 * (i / 10) + (Math.sin(Date.now() * 0.01 + i) * 20)
          const py = cometY + 10 * i
          ctx.save()
          ctx.globalAlpha = 0.8 * (1 - i / 10)
          ctx.fillStyle = '#fbbf24'
          ctx.beginPath()
          ctx.arc(px, py, 2 + i / 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => cancelAnimationFrame(rafId)
  }, [game])

  const handleBet = () => {
    if (betAmount > userBalance || !game?.id) return
    placeBet(betAmount)
    setBetAmount(1)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-white">🌠 Cometa Estelar</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <i className="fa-solid fa-xmark text-xl" />
            </button>
          </div>
          
          {game && (
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-black text-yellow-400">
                  {game.multiplier.toFixed(2)}x
                </div>
                <div className="text-sm text-slate-400 uppercase tracking-wider">Multiplicador</div>
              </div>
              <div>
                <div className="text-lg font-mono">{game.time_left.toFixed(0)}s</div>
                <div className="text-sm text-slate-400 uppercase tracking-wider">Tempo</div>
              </div>
              <div>
                <div className="text-sm font-mono capitalize">{game.status}</div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">Status</div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="relative h-96 bg-slate-900/50">
          <canvas ref={canvasRef} className="w-full h-full" />
          <div className="absolute top-4 left-4 text-4xl font-black text-yellow-400 drop-shadow-2xl">
            {game?.multiplier?.toFixed(2)}x
          </div>
        </div>

        {/* Controles */}
        <div className="p-6 space-y-4">
          {game?.status === 'betting' ? (
            <>
              <div className="flex gap-3">
                <input 
                  type="range" 
                  min="1" 
                  max={Math.min(userBalance, 100)}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span className="font-mono text-lg font-bold text-white min-w-[3rem]">
                  {betAmount}
                </span>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setBetAmount(Math.min(userBalance, 1))}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-3 px-4 rounded-xl border border-white/10 uppercase tracking-widest text-sm transition-all"
                >
                  1
                </button>
                <button 
                  onClick={() => setBetAmount(Math.min(userBalance, 10))}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-3 px-4 rounded-xl border border-white/10 uppercase tracking-widest text-sm transition-all"
                >
                  10
                </button>
                <button 
                  onClick={() => setBetAmount(Math.min(userBalance, 50))}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-3 px-4 rounded-xl border border-white/10 uppercase tracking-widest text-sm transition-all"
                >
                  50
                </button>
              </div>

              <button 
                onClick={handleBet}
                disabled={betAmount > userBalance || !game}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 font-black py-4 px-8 rounded-xl shadow-xl hover:scale-[1.02] transition-all uppercase tracking-widest text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Desejar {betAmount} Poeiras ✨
              </button>

              <div className="text-center text-xs text-slate-400">
                Saldo jogo: {userBalance.toFixed(0)} poeiras
              </div>
            </>
          ) : game?.status === 'flying' ? (
            <div className="text-center py-8">
              <div className="text-4xl animate-pulse">🚀 VOANDO!</div>
              <div className="text-xl font-black text-yellow-400 mt-2">
                {game.multiplier.toFixed(2)}x
              </div>
              <div className="text-sm text-slate-400 mt-4">
                Clique "Coletar" antes do crash!
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-2xl">💥 CRASH!</div>
              <div className="text-lg text-yellow-400 mt-2">
                {game?.multiplier.toFixed(2)}x
              </div>
              <button 
                onClick={onClose}
                className="mt-6 bg-slate-800 hover:bg-slate-700 text-white font-black py-3 px-8 rounded-xl border border-white/10 uppercase tracking-widest"
              >
                Novo Jogo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
