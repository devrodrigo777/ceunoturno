'use client'
import { CometaGame, useCometaRealtime } from '../hooks/useCometaRealtime'
import { useState, useEffect, useRef } from 'react'

interface CometaTimerProps {
  userBalance: number
  game: CometaGame | null
  onClick?: () => void
  setMultiplier?: (multiplier: number) => void
  profile: any | null
}

export default function CometaTimer({ userBalance, game, onClick, setMultiplier, profile }: CometaTimerProps) {
  // const { game, isLoading } = useCometaRealtime()
  const {isLoading} = {isLoading: false} // placeholder para evitar erro de desestruturação
  const [showModal, setShowModal] = useState(false)
  const [displayMultiplier, setDisplayMultiplier] = useState(1.00)
  const [displayTimeLeft, setDisplayTimeLeft] = useState(12)
  
  
  const gameRef = useRef(game)
  const animationRef = useRef(0)
  const animationStartRef = useRef(0)
  const isAnimatingRef = useRef(false)
  
  // const lastFrameTimeRef = useRef(performance.now()) // ✅ NOVA: para 60fps fluido
  // const multiplierRef = useRef(1.00) // ✅ NOVA: multiplicador independente
  const serverStartRef = useRef<number | null>(null)
  const growthRateRef = useRef(0.00003) // mesma constante do backend

  
  // ✅ Atualiza game
  useEffect(() => {
    if (game) {
      gameRef.current = game
      
      if (game.status === 'flying') {
        console.log(game);
        serverStartRef.current = game.server_start_time
        isAnimatingRef.current = true
      } else {
        isAnimatingRef.current = false
      }
    }
  }, [game])

  // 🔥 RAF 60FPS - MULTIPLICADOR FLUIDO
  useEffect(() => {
  let rafId: number

  const animate = () => {
    rafId = requestAnimationFrame(animate)

    const game = gameRef.current
    if (!game) return

    // 🎯 BETTING sincronizado por tempo absoluto
    if (game.status === 'betting' && game.betting_start_time) {
      const elapsed = Date.now() - game.betting_start_time
      const remaining = Math.max(
        0,
        (game.betting_duration || 12000) - elapsed
      )

      setDisplayTimeLeft(remaining / 1000)
    }

    // 🚀 FLYING sincronizado por server_start_time
    else if (game.status === 'flying' && serverStartRef.current) {
      const elapsed = Date.now() - serverStartRef.current
      const multiplier = Math.exp(growthRateRef.current * elapsed)

      const finalMultiplier = Math.max(1, multiplier)
      setDisplayMultiplier(finalMultiplier)

      // ⚡ Atualiza App se receber a função
      if (setMultiplier) setMultiplier(finalMultiplier)

      // posição do cometa baseada no mesmo tempo
      const roundDuration = 120000 // 2 minutos para chegar no x1000
      const progress = Math.min(elapsed / roundDuration, 1)
      animationRef.current = progress * 100
    }


    // 💥 CRASHED
    else {
      setMultiplier(game.multiplier || 1)
      setDisplayMultiplier(game.multiplier || 1)
      setDisplayTimeLeft(0)
    }
  }

  rafId = requestAnimationFrame(animate)

  return () => cancelAnimationFrame(rafId)
}, [])


  if (isLoading) {
    return <div className="w-[320px] h-32 animate-pulse bg-slate-900/50 rounded-2xl border border-white/10 shadow-xl" />
  }

  if (!game?.id) {
    return (
      <>
        <div 
      className="fixed z-10 left-2 bottom-6 w-[40%] max-w-[320px] h-32 bg-gradient-to-r from-slate-900/80 via-purple-900/60 to-slate-900/80 
                  border-2 border-gradient-to-r from-yellow-400/50 to-orange-500/50 
                  rounded-2xl backdrop-blur-xl cursor-pointer hover:scale-[1.02] transition-all duration-200
                  shadow-2xl hover:shadow-yellow-400/30 active:scale-[0.98] overflow-hidden"
      onClick={onClick}
    ></div>
      </>
    )
  }

  // const game = gameRef.current!
  const timeStr = Math.floor(Math.max(0, displayTimeLeft)).toString().padStart(2, '0')
  const showComet = game.status === 'flying' || animationRef.current > 0
  const isCrashed = game.status !== 'betting' && game.status !== 'flying'

  return (
    <div 
      className="fixed z-10 left-2 bottom-6 w-[40%] max-w-[320px] h-32 bg-gradient-to-r from-slate-900/80 via-purple-900/60 to-slate-900/80 
                  border-2 border-gradient-to-r from-yellow-400/50 to-orange-500/50 
                  rounded-2xl backdrop-blur-xl cursor-pointer hover:scale-[1.02] transition-all duration-200
                  shadow-2xl hover:shadow-yellow-400/30 active:scale-[0.98] overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r 
                      from-yellow-400/10 via-transparent to-orange-400/10 
                      animate-shimmer-slow opacity-50" />
      
      {showComet && (
        <>
          <div 
            className={`absolute top-[40%] w-3.5 h-3 rounded-full shadow-2xl border-2 border-white/60 pointer-events-none ${
              isCrashed
                ? 'bg-gray-400/90 shadow-gray-500/50 animate-pulse-slow'
                : 'bg-gradient-to-r from-yellow-400/95 via-orange-500/90 to-yellow-300/80 shadow-[0_0_25px_rgba(255,193,7,0.8)]'
            }`}
            style={{
              left: `${animationRef.current}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className={`absolute -bottom-3 left-1/2 w-2 h-12 rounded-full blur-sm -translate-x-1/2 ${
              isCrashed
                ? 'bg-gradient-to-t from-gray-400/50 to-transparent opacity-60'
                : 'bg-gradient-to-t from-orange-400/85 via-yellow-400/60 via-blue-400/30 to-transparent'
            }`} />
          </div>
          
          <div 
            className={`absolute top-[35%] w-2 h-2 rounded-full shadow-lg blur-sm pointer-events-none ${isCrashed ? 'opacity-40' : ''}`}
            style={{ left: `${Math.max(0, animationRef.current - 10)}%`, transform: 'translateX(-50%)' }}
          />
          <div 
            className={`absolute top-[45%] w-1.5 h-1.5 rounded-full shadow-md blur-sm pointer-events-none ${isCrashed ? 'opacity-30' : ''}`}
            style={{ left: `${Math.max(0, animationRef.current - 15)}%`, transform: 'translateX(-50%)' }}
          />
        </>
      )}

      <div className="relative p-3 h-full flex flex-col justify-between z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full shadow-lg transition-all duration-200 ${
              game.status === 'flying' ? 'bg-emerald-400 shadow-emerald-500/50 animate-ping' :
              game.status === 'betting' ? 'bg-yellow-400 shadow-yellow-500/50' : 
              'bg-red-500 shadow-red-500/50'
            }`} />
            <span className="text-sm font-black text-white/95 tracking-wider uppercase">
              {game.status == 'betting'  && `Novo cometa em ${timeStr}s.`}
              {game.status == 'flying' && 'Cometa em voo'}
              {game.status == 'crashed' && 'Cometa caiu'}
            </span>
          </div>
        </div>
        
        <div className={`
          text-4xl font-black leading-none select-none
          ${game.status === 'flying' 
            ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse-fast' 
            : game.status === 'betting'
            ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]'
            : 'text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]'
          }
        `}>
          {displayMultiplier.toFixed(2)}<span className="text-lg font-normal opacity-90">x</span>
        </div>
      </div>
    </div>
  )
}
