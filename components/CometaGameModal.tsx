'use client'
import { CometaGame } from '@/hooks/useCometaRealtime'
import { useEffect, useRef, useState } from 'react'

interface Props {
  userBalance: number
  onClose: () => void
  isOpen: boolean
  game: CometaGame | null
  placeBet: (amount: number) => Promise<void>
  cashout: () => Promise<void>
  betAmount: number
  setBetAmount: (amount: number) => void
  currentMultiplier: number
  hasActiveBet: boolean
  hasCashout: boolean,
  cashoutAmount: number
  bets: any[]
}

export function CometaGameModal({
  userBalance,
  isOpen,
  onClose,
  game,
  placeBet,
  betAmount,
  setBetAmount,
  currentMultiplier,
  hasActiveBet,
  cashout,
  hasCashout,
  cashoutAmount,
  bets
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [particles, setParticles] = useState<{x:number,y:number,size:number,alpha:number}[]>([])
  const [displayTimeLeft, setDisplayTimeLeft] = useState(0)
  const [isPlacing, setIsPlacing] = useState(false)
  const [isCashing, setIsCashing] = useState(false)
  const [myMultiplier, setMyMultiplier] = useState(1.00);
  const [isBetting, setIsBetting] = useState(false);
  

  const bgRef = useRef<HTMLImageElement | null>(null)


  // Sempre atualizar o myMultiplier conforme o currentMultiplier, exceto quando crashar. Aí ele assume o game.multiplier final.
  useEffect(() => {
    if (!game) return

    if (game.status === 'flying') {
      setMyMultiplier(currentMultiplier)
    } else if (game.status === 'crashed') {
      
      setMyMultiplier(game.multiplier || 1)
      setIsBetting(false)
      
    }
  });

  // Carrega imagem de fundo
  useEffect(() => {
    const img = new Image()
    img.src = '/bg.png'
    img.className = 'bg-img'
    img.onload = () => { bgRef.current = img }
  }, [])

  // Inicializa partículas
  useEffect(() => {
    const arr = Array.from({length: 30}, () => ({
      x: 0, y:0, size: Math.random()*3+2, alpha: Math.random()*0.5+0.3
    }))
    setParticles(arr)
  }, [])

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !game) return
    const ctx = canvas.getContext('2d')!
    
    // Ajusta tamanho do canvas
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    let rafId: number
    let scrollY = 0

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Fundo base escuro
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // BG Animado (Scrolling)
      if (bgRef.current) {
        scrollY += 0.2 // Velocidade do scroll
        if (scrollY >= canvas.height) scrollY = 0
        
        // Desenha duas vezes para loop infinito vertical
        // A imagem deve ser desenhada de forma que cubra o canvas
        // Vamos desenhar a imagem esticada para cobrir a largura
        ctx.drawImage(bgRef.current, 0, scrollY, canvas.width, canvas.height)
        ctx.drawImage(bgRef.current, 0, scrollY - canvas.height, canvas.width, canvas.height)
      } else {
         // Fallback gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, '#0f172a')
        gradient.addColorStop(1, '#1e293b')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      if (game.status === 'flying' || game.status === 'crashed') {
        // Escala logarítmica até 50x para atingir o topo
        // Math.log(1) = 0, Math.log(50) = max
        
        const progress = Math.min(Math.log(myMultiplier)/Math.log(50), 1)
        
        const cometX = canvas.width/2
        // Começa em 80% da altura e vai até 20% (topo com margem)
        const startY = canvas.height * 0.8
        const endY = canvas.height * 0.2
        const cometY = startY - (startY - endY) * progress

        // Rastro do cometa
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.3 + 0.5*(1-progress)})`
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(cometX, canvas.height + 50) // Rastro vem de baixo da tela
        ctx.lineTo(cometX, cometY)
        ctx.stroke()

        // Cometa principal
        ctx.fillStyle = '#facc15'
        ctx.shadowColor = '#facc15'
        ctx.shadowBlur = 40
        ctx.beginPath()
        ctx.arc(cometX, cometY, 10, 0, Math.PI*2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Partículas ao redor
        particles.forEach((p, idx) => {
          const px = cometX + Math.sin(Date.now()*0.002 + idx)*30 - idx
          const py = cometY + idx*6 + 20
          ctx.save()
          ctx.globalAlpha = p.alpha * (1-progress)
          ctx.fillStyle = '#fbbf24'
          ctx.beginPath()
          ctx.arc(px, py, p.size, 0, Math.PI*2)
          ctx.fill()
          ctx.restore()
        })
      }

      rafId = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(rafId)
  }, [game, myMultiplier, particles])

  // Timer logic
  useEffect(() => {
    if (!game) return

    let rafId: number
    const updateTimer = () => {
      if (game.status === 'betting' && game.betting_start_time) {
        const elapsed = Date.now() - game.betting_start_time
        const duration = game.betting_duration || 12000
        const remaining = Math.max(0, duration - elapsed + 1000)
        setDisplayTimeLeft(remaining / 1000)
      } else {
        setDisplayTimeLeft(0)
      }
      rafId = requestAnimationFrame(updateTimer)
    }
    
    updateTimer()
    return () => cancelAnimationFrame(rafId)
  }, [game])

  const handleBet = async () => {
    if (isPlacing) return
    if (betAmount > userBalance || betAmount <= 0) return
    if (!game?.id) return

    try {
      setIsPlacing(true)
      await placeBet(betAmount)
      setIsBetting(true);
      // setBetAmount(1)
    } finally {
      setIsPlacing(false)
    }
  }

  const handleCashout = async () => {
    if (isCashing) return

    try {
      setIsCashing(true)
      await cashout()
    } finally {
      setIsCashing(false)
    }
  }

  const getStatusLabel = (status: string) => {
      if (status === 'betting') return 'Apostas Abertas'
      if (status === 'flying') return 'Em Voo'
      if (status === 'crashed') return 'Explodiu'
      return status
  }

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não é dígito para garantir que só aceite números
    const rawValue = e.target.value.replace(/\D/g, '')
    // Converte para decimal (ex: 100 vira 1.00)
    const amount = Number(rawValue) / 100
    setBetAmount(amount)
  }

  if (!game) return null

  return (
    <div className={`fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-4 bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${game.status === 'flying' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                <h2 className="text-lg font-black text-white uppercase tracking-widest">Sorte no Cometa</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">✕</button>
          </div>

          <div className="flex justify-center items-end">
            <div className="text-center">
                {game.status === 'betting' && (
                    <div className="inline-block bg-white/10 px-2 py-1 rounded-md">
                        <span className="text-xs font-mono text-white font-bold">
                            Novo cometa irá surgir em <span className="text-yellow-400">{Math.floor(displayTimeLeft)}s</span>
                        </span>
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative flex-1 min-h-[300px] bg-slate-950">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          
          {/* Badge de Desejos */}
          {bets.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{bets.length} {bets.length === 1 ? 'Desejo' : 'Desejos'}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-5 bg-slate-900 border-t border-white/10">
          {game.status === 'betting' ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                 <span>Sua Aposta</span>
                 <span>Saldo: <span className="text-yellow-400">{formatBRL(userBalance)}</span></span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <i className="fa-solid fa-bolt text-yellow-400 text-xs"></i>
                    </div>
                    <input 
                    type="text"
                    disabled={isBetting}
                    inputMode="numeric"
                    value={formatBRL(betAmount)}
                    onChange={handleAmountChange}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-8 pr-3 text-white font-mono font-bold focus:ring-2 focus:ring-yellow-400/50 outline-none transition-all"
                    />
                </div>
                <button 
                    onClick={() => setBetAmount(Math.floor(userBalance))}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 transition-colors"
                >
                    Max
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[2, 5, 20, 50].map(n=>(
                  <button 
                    key={n}
                    onClick={()=>setBetAmount(n)}
                    className="bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-2 rounded-lg text-xs border border-white/5 transition-all"
                  >
                    +{formatBRL(n)}
                  </button>
                ))}
              </div>

              {!hasActiveBet && (
                <button 
                  onClick={handleBet}
                  disabled={betAmount > userBalance || betAmount <= 0}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-yellow-400 to-orange-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-50 text-slate-950 font-black py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                      {isPlacing ? `Processando...` : (
                        <>FAZER APOSTA <i className="fa-solid fa-rocket"></i></>
                      )}
                  </span>
                </button>
              )}

              {hasActiveBet && (
                <button 
                  disabled={hasActiveBet}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-green-400 to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-50 text-slate-100 font-black py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                      APOSTANDO {formatBRL(betAmount)}
                  </span>
                </button>
              )}
              
            </div>
          ) : game.status === 'flying' ? (
            <div className="py-2 space-y-4 text-center animate-in zoom-in-95 duration-300">
              <div className="inline-flex flex-col items-center justify-center">
                  <div className="text-xs font-black text-green-400 uppercase tracking-[0.3em] mb-2 animate-pulse">Cometa em Ascensão</div>
                  <div className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                    {myMultiplier.toFixed(2)}x
                  </div>
              </div>
              
              {hasActiveBet ? (
                <button
                  onClick={handleCashout}
                  disabled={isCashing || hasCashout}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-green-400 to-emerald-500 disabled:opacity-50 text-slate-950 font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                >
                  <span className="relative flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                    {!hasCashout && (
                      <>
                      {isCashing
                      ? "Sacando..."
                      : `REIVINDICAR R$ ${formatBRL(
                          betAmount * myMultiplier
                        )}`}
                      </>
                    )}

                    {hasCashout && `Sacado R$ ${formatBRL(cashoutAmount)}`}

                  </span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full bg-slate-800/50 border border-white/10 text-slate-500 font-black py-4 rounded-xl uppercase tracking-widest text-sm cursor-not-allowed"
                >
                  Aguardando Resultado...
                </button>
              )}
            </div>
          ) : (
            <div className="py-2 space-y-4 text-center animate-in shake duration-300">
               <div className="inline-flex flex-col items-center justify-center">
                  <div className="text-xs font-black text-red-500 uppercase tracking-[0.3em] mb-2">O Cometa Explodiu</div>
                  <div className="text-5xl font-black text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]">
                    {myMultiplier.toFixed(2)}x
                  </div>
              </div>

              {/* <button 
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-xl border border-white/10 uppercase tracking-widest text-sm transition-all"
              >
                Fechar
              </button> */}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
