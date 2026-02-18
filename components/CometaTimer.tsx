'use client'
import { useCometaRealtime } from '../hooks/useCometaRealtime'
import { useState, useEffect, useRef, useCallback } from 'react'
import { CometaGameModal } from './CometaGameModal'

export default function CometaTimer({ userBalance }: { userBalance: number }) {
  const { game, isLoading, placeBet } = useCometaRealtime()
  const [showModal, setShowModal] = useState(false)
  const [betAmount, setBetAmount] = useState(1)
  
  // 🥇 VALORES FLUÍDOS
  const [displayMultiplier, setDisplayMultiplier] = useState(1.00)
  const [displayTimeLeft, setDisplayTimeLeft] = useState(12)
  const lastGameRef = useRef(game)
  const lastUpdateRef = useRef(Date.now())

  // Salva referências
  useEffect(() => {
    if (game) {
      lastGameRef.current = game
      
      // ✅ FIX: Sempre timestamp válido
      const now = Date.now()
      lastUpdateRef.current = now
    }
  }, [game])

  // 🔥 RAF LOOP 60fps - SEM ERROS
  useEffect(() => {
    let raf: number

    const animate = () => {
      raf = requestAnimationFrame(animate)
      
      const game = lastGameRef.current
      if (!game) return

      const now = Date.now()
      const elapsedMs = now - lastUpdateRef.current  // ✅ Sempre positivo
      const elapsedSeconds = Math.min(elapsedMs / 1000, 1) // MAX 1s

      // ⏱️ BETTING: Countdown suave
      if (game.status === 'betting') {
        const predictedTimeLeft = Math.max(0, game.time_left - elapsedSeconds)
        setDisplayTimeLeft(predictedTimeLeft)
      }
      
      // 🚀 FLYING: Multiplicador suave
      else if (game.status === 'flying') {
        const growthPerSecond = 0.12  // Backend rate
        const predictedMultiplier = game.multiplier + (elapsedSeconds * growthPerSecond)
        const safeMultiplier = Math.max(1.00, Math.min(predictedMultiplier, game.crash_point || 10))
        setDisplayMultiplier(safeMultiplier)
      }
      
      // 💥 CRASHED: trava no valor final
      else if (game.status === 'crashed') {
        setDisplayMultiplier(game.multiplier || 1.00)
        setDisplayTimeLeft(0)
      }
    }

    requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (isLoading) return <div className="animate-pulse bg-slate-900/50 h-32 rounded-xl border border-white/10" />
  if (!lastGameRef.current) return <div className="h-32 bg-slate-900/50 rounded-xl animate-pulse" />

//   const game = lastGameRef.current
  const timeStr = Math.floor(Math.max(0, displayTimeLeft)).toString().padStart(2, '0')

  return (
    <>
      <div 
        className="relative w-full h-32 bg-gradient-to-r from-slate-900/80 via-purple-900/60 to-slate-900/80 
                    border-2 border-gradient-to-r from-yellow-400/50 to-orange-500/50 
                    rounded-2xl backdrop-blur-xl cursor-pointer hover:scale-105 transition-all duration-200
                    shadow-2xl hover:shadow-yellow-400/30"
        onClick={() => setShowModal(true)}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r 
                        from-yellow-400/10 via-transparent to-orange-400/10 
                        animate-shimmer-slow opacity-50" />
        
        <div className="relative p-5 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${
                game.status === 'flying' ? 'bg-emerald-400 shadow-emerald-500/50 animate-ping' :
                game.status === 'crashed' ? 'bg-red-500 shadow-red-500/50' : 
                'bg-yellow-400 shadow-yellow-500/50'
              }`} />
              <span className="text-sm font-black text-white/95 tracking-wider">Cometa</span>
            </div>
          </div>
          
          <div className={`
            text-4xl font-black leading-none select-none
            ${game.status === 'flying' 
              ? 'text-emerald-400 drop-shadow-emerald-500/75 animate-pulse-fast' 
              : game.status === 'crashed' 
              ? 'text-red-400 drop-shadow-red-500/75' 
              : 'text-yellow-400 drop-shadow-yellow-500/75'
            }
          `}>
            {displayMultiplier.toFixed(2)}
            <span className="text-lg font-normal opacity-90">x</span>
          </div>
          
          <div className="flex items-center justify-between text-xs font-mono tracking-wider text-slate-300">
            <span>
              {game.status === 'betting' && `${timeStr}s`}
              {game.status === 'flying' && '🚀'}
              {game.status === 'crashed' && '💥'}
            </span>
            <span className="bg-black/40 px-2 py-0.5 rounded-full text-xs">
              {userBalance.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* {showModal && (
        <CometaGameModal 
          game={game} 
          userBalance={userBalance}
          onClose={() => setShowModal(false)}
          placeBet={placeBet}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
        />
      )} */}
    </>
  )
}
