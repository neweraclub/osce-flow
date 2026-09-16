'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Brain,
  Droplets,
  Heart,
  Wind,
} from 'lucide-react'

export default function LandingPage() {
  // Cursor Tracking with Smooth Damping (Lerp) for 3D Physics
  const [targetTilt, setTargetTilt] = useState({ x: 0, y: 0 })
  const [currentTilt, setCurrentTilt] = useState({ x: 0, y: 0 })
  const [mouseSpeed, setMouseSpeed] = useState(0)
  const lastMousePos = useRef({ x: 0, y: 0, time: Date.now() })
  const mouseCoords = useRef({ x: -1000, y: -1000 })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Specialty strip hover state
  const [hoveredSpecialty, setHoveredSpecialty] = useState<string | null>(null)

  // Mouse move handler for 3D tilt & velocity
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e
    const { innerWidth, innerHeight } = window

    // Normalized -1 to +1 coordinates
    const nx = (clientX / innerWidth - 0.5) * 2
    const ny = (clientY / innerHeight - 0.5) * 2

    setTargetTilt({ x: nx, y: ny })
    mouseCoords.current = { x: clientX, y: clientY }

    // Calculate mouse speed for dynamic ECG reaction
    const now = Date.now()
    const dt = Math.max(now - lastMousePos.current.time, 16)
    const dx = clientX - lastMousePos.current.x
    const dy = clientY - lastMousePos.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const speed = Math.min(dist / dt, 5)

    setMouseSpeed((prev) => Math.max(prev * 0.85, speed))
    lastMousePos.current = { x: clientX, y: clientY, time: now }
  }

  // Smooth lerp animation loop for 3D tilt
  useEffect(() => {
    let animId: number
    const updateTilt = () => {
      setCurrentTilt((prev) => ({
        x: prev.x + (targetTilt.x - prev.x) * 0.08,
        y: prev.y + (targetTilt.y - prev.y) * 0.08,
      }))
      animId = requestAnimationFrame(updateTilt)
    }
    animId = requestAnimationFrame(updateTilt)
    return () => cancelAnimationFrame(animId)
  }, [targetTilt])

  // =========================================================================
  // CONTINUOUS REACTIVE ECG HEARTBEAT LINE
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let offset = 0
    let currentSpeed = 1.6

    const resize = () => {
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const render = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      ctx.clearRect(0, 0, width, height)

      // Speed adapts smoothly to mouse velocity
      const targetSpeed = 1.4 + mouseSpeed * 1.8
      currentSpeed += (targetSpeed - currentSpeed) * 0.05
      offset += currentSpeed

      // Y Baseline placed horizontally across the lower-middle viewport
      const yBase = height * 0.58

      // Determine mouse influence on ECG amplitude & glow
      const mx = mouseCoords.current.x
      const my = mouseCoords.current.y
      const hasMouse = mx > 0 && my > 0

      // Create gradient for the ECG trace with emerald-cyan sheen
      const grad = ctx.createLinearGradient(0, 0, width, 0)
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.0)')
      grad.addColorStop(0.15, 'rgba(6, 182, 212, 0.18)')
      grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.35)')
      grad.addColorStop(0.85, 'rgba(99, 102, 241, 0.22)')
      grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)')

      ctx.beginPath()
      ctx.strokeStyle = grad
      ctx.lineWidth = 1.75
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'

      // Step across canvas
      const step = 3
      for (let x = 0; x <= width; x += step) {
        // Biometric QRS Complex Cycle Length (320px cycle)
        const cycle = (x + offset) % 320
        let dy = 0

        // P-Wave (Atrial Depolarization)
        if (cycle >= 40 && cycle < 65) {
          const progress = (cycle - 40) / 25
          dy = -Math.sin(progress * Math.PI) * 7
        }
        // Q-Dip
        else if (cycle >= 85 && cycle < 95) {
          const progress = (cycle - 85) / 10
          dy = Math.sin(progress * Math.PI) * 6
        }
        // R-Spike (Ventricular Depolarization - Sharp Peak)
        else if (cycle >= 95 && cycle < 112) {
          const progress = (cycle - 95) / 17
          dy = -Math.sin(progress * Math.PI) * 48
        }
        // S-Dip
        else if (cycle >= 112 && cycle < 125) {
          const progress = (cycle - 112) / 13
          dy = Math.sin(progress * Math.PI) * 14
        }
        // T-Wave (Ventricular Repolarization)
        else if (cycle >= 150 && cycle < 185) {
          const progress = (cycle - 150) / 35
          dy = -Math.sin(progress * Math.PI) * 12
        }

        // Fluid Mouse Interaction: wave baseline gently arches toward mouse proximity
        if (hasMouse) {
          const distX = Math.abs(x - mx)
          const distY = Math.abs(yBase - my)
          const totalDist = Math.sqrt(distX * distX + distY * distY)
          const influence = Math.max(0, 1 - totalDist / 340)
          if (influence > 0) {
            // Organic upward/downward curvature near cursor
            const mousePull = (my - yBase) * 0.12 * Math.sin(influence * Math.PI)
            dy += mousePull
          }
        }

        const finalY = yBase + dy
        if (x === 0) {
          ctx.moveTo(x, finalY)
        } else {
          ctx.lineTo(x, finalY)
        }
      }

      ctx.stroke()

      // Subtle phosphor glow line pass
      ctx.save()
      ctx.shadowColor = 'rgba(16, 185, 129, 0.4)'
      ctx.shadowBlur = 8
      ctx.stroke()
      ctx.restore()

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [mouseSpeed])

  // Specialties dataset for bottom frosted capsules
  const specialties = [
    {
      id: 'cardio',
      name: 'Cardiologie',
      icon: Heart,
      accentColor: 'rose',
      glowClass: 'hover:shadow-[0_0_35px_rgba(244,63,94,0.3)] hover:border-rose-500/40 hover:bg-rose-950/20',
      iconColor: 'text-rose-400',
    },
    {
      id: 'neuro',
      name: 'Neurologie',
      icon: Brain,
      accentColor: 'indigo',
      glowClass: 'hover:shadow-[0_0_35px_rgba(99,102,241,0.3)] hover:border-indigo-500/40 hover:bg-indigo-950/20',
      iconColor: 'text-indigo-400',
    },
    {
      id: 'pneumo',
      name: 'Pneumologie',
      icon: Wind,
      accentColor: 'cyan',
      glowClass: 'hover:shadow-[0_0_35px_rgba(6,182,212,0.3)] hover:border-cyan-500/40 hover:bg-cyan-950/20',
      iconColor: 'text-cyan-400',
    },
    {
      id: 'nephro',
      name: 'Néphrologie',
      icon: Droplets,
      accentColor: 'emerald',
      glowClass: 'hover:shadow-[0_0_35px_rgba(16,185,129,0.3)] hover:border-emerald-500/40 hover:bg-emerald-950/20',
      iconColor: 'text-emerald-400',
    },
  ]

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-screen h-screen min-h-[680px] bg-[#04070B] text-white flex flex-col justify-between items-center overflow-hidden select-none font-sans"
    >
      {/* ===================================================================== */}
      {/* 1. ATMOSPHERIC CANVAS & TRICOLOR BREATHING GLOW                       */}
      {/* ===================================================================== */}

      {/* Reactive ECG Biometric Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
      />

      {/* Central Breathing Aura Orb - Soft shifting between Indigo, Emerald, Cyan */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[650px] sm:size-[850px] rounded-full blur-[140px] opacity-40 transition-all duration-1000 animate-pulse"
        style={{
          background:
            'radial-gradient(circle at center, rgba(99,102,241,0.25) 0%, rgba(16,185,129,0.20) 40%, rgba(6,182,212,0.18) 70%, transparent 85%)',
          animationDuration: '10s',
        }}
      />

      {/* Secondary Ambient Accent Blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[15%] left-[20%] size-[450px] rounded-full bg-indigo-500/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[15%] right-[20%] size-[500px] rounded-full bg-emerald-500/10 blur-[130px]"
      />

      {/* Subtle Micro Dot-Matrix Texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)] opacity-40"
      />

      {/* ===================================================================== */}
      {/* 2. MINIMAL HEADER                                                     */}
      {/* ===================================================================== */}
      <header className="relative z-20 w-full pt-8 sm:pt-10 flex items-center justify-center">
        <span className="text-sm sm:text-base font-bold tracking-[0.28em] uppercase text-slate-200/90 hover:text-white transition-colors">
          OSCE<span className="text-cyan-400 font-mono">-flow</span>
        </span>
      </header>

      {/* ===================================================================== */}
      {/* 3. THE CENTERPIECE (VISUAL ANCHOR)                                    */}
      {/* ===================================================================== */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto my-auto space-y-8 sm:space-y-10">
        {/* Crisp Headline & Subtitle */}
        <div className="space-y-3.5 max-w-2xl">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            Redefining Clinical Exams.
          </h1>
          <p className="text-base sm:text-lg md:text-xl font-normal text-slate-400 leading-relaxed tracking-normal">
            Fluid, objective assessment for modern medical faculties.
          </p>
        </div>

        {/* Floating 3D Glass Emblem with Continuous Pulse Wave */}
        <div
          className="relative flex items-center justify-center pt-2"
          style={{ perspective: '1200px' }}
        >
          {/* Continuous Glowing Pulse Waves Rippling Outward */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="absolute size-44 sm:size-52 rounded-full border border-cyan-400/30 animate-ping"
              style={{ animationDuration: '3.6s' }}
            />
            <span
              className="absolute size-60 sm:size-72 rounded-full border border-emerald-400/20 animate-ping"
              style={{ animationDuration: '4.8s', animationDelay: '1.2s' }}
            />
            <span
              className="absolute size-72 sm:size-88 rounded-full border border-indigo-400/15 animate-ping"
              style={{ animationDuration: '6s', animationDelay: '2.4s' }}
            />
          </div>

          {/* 3D Tilting Glass Emblem Prism */}
          <div
            className="relative size-40 sm:size-48 rounded-3xl p-0.5 transition-transform duration-100 ease-out will-change-transform"
            style={{
              transform: `rotateX(${currentTilt.y * -14}deg) rotateY(${currentTilt.x * 14}deg) translateZ(30px)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Luminous Specular Border Reflection */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-cyan-400/30 via-white/20 to-emerald-400/30 blur-xs" />

            {/* Frosted Glass Body */}
            <div className="relative size-full rounded-3xl bg-gradient-to-b from-white/[0.10] via-white/[0.04] to-black/40 backdrop-blur-2xl border border-white/20 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.35)] flex items-center justify-center overflow-hidden group">
              {/* Internal Caustic Light Ray Sweep */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent opacity-80" />

              {/* Central Concentric Frosted Core Ring */}
              <div className="relative size-24 sm:size-28 rounded-2xl bg-white/[0.05] border border-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
                {/* Stylized Medical Heart & Caduceus Emblem SVG */}
                <svg
                  viewBox="0 0 100 100"
                  className="size-14 sm:size-16 drop-shadow-[0_0_14px_rgba(6,182,212,0.6)]"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="emblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06B6D4" />
                      <stop offset="50%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#6366F1" />
                    </linearGradient>
                    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Stylized Cardiac Outer Silhouette */}
                  <path
                    d="M50 82C50 82 22 62 16 42C11 25 24 16 35 18C42 19.5 47 24 50 28C53 24 58 19.5 65 18C76 16 89 25 84 42C78 62 50 82 50 82Z"
                    stroke="url(#emblemGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-90"
                  />

                  {/* Intersecting Biometric Rhythm Beam */}
                  <path
                    d="M20 50H36L42 36L48 64L54 44L58 54L62 50H80"
                    stroke="url(#emblemGrad)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#softGlow)"
                  />

                  {/* Ascending Staff / Honor Beacon */}
                  <line
                    x1="50"
                    y1="14"
                    x2="50"
                    y2="26"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="50" cy="12" r="3" fill="#06B6D4" />
                </svg>
              </div>

              {/* Bottom Subtle Refractive Rim */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
            </div>
          </div>
        </div>
      </main>

      {/* ===================================================================== */}
      {/* 4. BOTTOM FLOATING SPECIALTY STRIP                                    */}
      {/* ===================================================================== */}
      <footer className="relative z-20 pb-10 sm:pb-12 px-6 w-full flex justify-center">
        <div className="flex items-center justify-center flex-wrap gap-3 sm:gap-4 max-w-4xl mx-auto">
          {specialties.map((item) => {
            const Icon = item.icon
            const isHovered = hoveredSpecialty === item.id

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredSpecialty(item.id)}
                onMouseLeave={() => setHoveredSpecialty(null)}
                className={`group px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-lg transition-all duration-300 flex items-center gap-3 cursor-default ${item.glowClass} ${
                  isHovered ? 'scale-105' : 'scale-100'
                }`}
              >
                {/* Organ Icon with smooth heartbeat pulse on hover */}
                <div
                  className={`size-7 rounded-full flex items-center justify-center transition-transform duration-300 ${
                    item.iconColor
                  } ${isHovered ? 'scale-125' : 'scale-100'}`}
                >
                  <Icon
                    className={`size-4 transition-transform duration-300 ${
                      isHovered ? 'animate-pulse' : ''
                    }`}
                  />
                </div>

                {/* Specialty Name */}
                <span
                  className={`text-xs sm:text-sm font-medium tracking-wide transition-colors duration-200 ${
                    isHovered ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {item.name}
                </span>
              </div>
            )
          })}
        </div>
      </footer>
    </div>
  )
}
