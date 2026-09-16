'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Brain,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Droplets,
  ExternalLink,
  Eye,
  FileCheck2,
  GraduationCap,
  Heart,
  HeartPulse,
  Layers,
  Lock,
  Microscope,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LandingPage() {
  // 3D Perspective Physics State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHoveringHero, setIsHoveringHero] = useState(false)

  // Soundscape State (Web Audio API Synthesizer)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Theme Hue Filter State: 'all' | 'indigo' | 'emerald' | 'cyan'
  const [activeHue, setActiveHue] = useState<'all' | 'indigo' | 'emerald' | 'cyan'>('all')

  // Live countdown timer for Examiner tablet mockup
  const [timerSeconds, setTimerSeconds] = useState(462) // 07:42
  const [pinVerified, setPinVerified] = useState(false)

  // Organ animation state
  const [activeOrganHover, setActiveOrganHover] = useState<string | null>(null)

  // Canvas ref for ECG background wave
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Play subtle clinical audio tone on interaction if sound is unmuted
  const playClinicalChime = (freq = 520, type: OscillatorType = 'sine') => {
    if (!soundEnabled || typeof window === 'undefined') return
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    } catch {
      // Audio context policy fallback
    }
  }

  // Ticking countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerSeconds((prev) => (prev > 1 ? prev - 1 : 480))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Mouse coordinate tracker for 3D card tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setMousePos({ x, y })
  }

  // Interactive ECG Rhythm Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let offset = 0

    const resize = () => {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const render = () => {
      offset += 1.5
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw faint biometric ECG wave across lower screen
      const yBase = canvas.height * 0.72
      ctx.beginPath()
      ctx.strokeStyle = activeHue === 'cyan' ? 'rgba(6, 182, 212, 0.18)' : activeHue === 'indigo' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(5, 150, 105, 0.20)'
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'

      for (let x = 0; x < canvas.width; x += 3) {
        const cycle = (x + offset) % 280
        let dy = 0
        if (cycle > 90 && cycle < 100) dy = -8
        else if (cycle >= 100 && cycle < 112) dy = 10
        else if (cycle >= 112 && cycle < 125) dy = -36 // QRS peak
        else if (cycle >= 125 && cycle < 135) dy = 14
        else if (cycle >= 150 && cycle < 175) dy = -10 // T wave

        const y = yBase + dy
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [activeHue])

  // Formatted countdown clock string
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Organ list with custom SVGs / icons
  const organs = [
    { id: 'cardio', name: 'Cardiologie', specialty: 'Cardiovascular', icon: Heart, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    { id: 'pneumo', name: 'Pneumologie', specialty: 'Respiratory', icon: Wind, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
    { id: 'neuro', name: 'Neurologie', specialty: 'Neuroscience', icon: Brain, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
    { id: 'nephro', name: 'Néphrologie', specialty: 'Renal Biology', icon: Droplets, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    { id: 'hemato', name: 'Hématologie', specialty: 'Oncology', icon: Microscope, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  ]

  // Real-time telemetry feed messages
  const telemetryFeed = [
    'CIRCUIT ALPHA: ROOM 104 [CARDIOLOGIE] ── SCORE SUBMITTED BY PROF. EXAMINER',
    'PIN REFRESH: STATION 06 ── EXAMINER AUTHENTICATED & READY',
    'COHORT ROTATION: SECTION A ── SQUAD 02 ADVANCING ON BELL RINGER',
    'PNEUMOLOGIE STATION 04 ── CANDIDATE ENTERING CLINICAL ROOM',
    'EXAMINATION TRANSCRIPTS SYNCHRONIZED ── CRYPTOGRAPHIC TLS 1.3 LEDGER',
    'DEAN COMMAND DESK: 24/24 STATIONS ACTIVE ACROSS UNIVERSITY HOSPITALS',
  ]

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-[#05080E] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-black"
    >
      {/* ========================================================================= */}
      {/* 1. ATMOSPHERIC CANVAS & TRICOLOR RADIAL AURORA                            */}
      {/* ========================================================================= */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
      />

      {/* Tricolor Radial Aurora Orbs */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-[-10%] left-[-5%] size-[600px] rounded-full blur-3xl transition-opacity duration-700 ${
          activeHue === 'all' || activeHue === 'indigo' ? 'bg-indigo-600/20 opacity-100' : 'opacity-10'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-[20%] right-[-5%] size-[650px] rounded-full blur-3xl transition-opacity duration-700 ${
          activeHue === 'all' || activeHue === 'emerald' ? 'bg-emerald-600/20 opacity-100' : 'opacity-10'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-[-10%] left-[25%] size-[700px] rounded-full blur-3xl transition-opacity duration-700 ${
          activeHue === 'all' || activeHue === 'cyan' ? 'bg-cyan-500/20 opacity-100' : 'opacity-10'
        }`}
      />

      {/* Subtle Clinical Dot-Matrix Grid Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_90%)] opacity-30"
      />

      {/* ========================================================================= */}
      {/* 2. FLOATING TOP COMMAND CONTROLS (NO NAVBAR CLUTTER)                     */}
      {/* ========================================================================= */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-6 flex items-center justify-between">
        {/* Left: Discreet Brand Sigil */}
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-emerald-500 to-cyan-400 p-0.5 shadow-md shadow-cyan-500/20">
            <div className="size-full bg-[#05080E] rounded-[10px] flex items-center justify-center text-cyan-300">
              <Activity className="size-4" />
            </div>
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white select-none">
            OSCE<span className="text-cyan-400 font-mono">-flow</span>
          </span>
        </div>

        {/* Center: Live Status Pill */}
        <div className="hidden sm:inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#0C1424]/90 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono backdrop-blur-xl shadow-lg shadow-emerald-950/40">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
          <span className="tracking-wide">SYSTEM STATUS: CLINICAL ENGINES SYNCHRONIZED</span>
        </div>

        {/* Right: Direct Portal Quick Links & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/student/results"
            className="text-xs font-semibold text-cyan-300 hover:text-white px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/40 backdrop-blur-md transition-all shadow-xs"
          >
            Candidate Results
          </Link>

          <Link
            href="/login"
            className="text-xs font-bold text-white px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-emerald-600 to-cyan-600 hover:opacity-90 transition-all shadow-md shadow-cyan-950/40 flex items-center gap-1.5"
          >
            <span>Faculty Login</span>
            <ArrowRight className="size-3.5" />
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. HERO IDENTITY & TYPOGRAPHY                                            */}
      {/* ========================================================================= */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 pt-8 pb-4 space-y-3">
        {/* Mobile Status Pill */}
        <div className="sm:hidden inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0C1424]/90 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono backdrop-blur-md mb-2">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Exam Network Active</span>
        </div>

        {/* Dynamic Brand Typography with Tricolor Gradient Sweep */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white select-none">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-cyan-400 animate-gradient-x">
            OSCE-flow
          </span>
        </h1>

        <p className="text-base sm:text-xl font-medium text-slate-300 max-w-2xl mx-auto leading-relaxed">
          The Modern Platform for Medical Clinical Exams.
        </p>

        <p className="text-xs font-mono uppercase tracking-widest text-slate-400 dark:text-cyan-400/80">
          Next-Generation Objective Structured Clinical Examination Infrastructure
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 4. CENTRAL SHOWCASE: 3D "TRI-PORTAL" HOLOGRAPHIC SLATES                   */}
      {/* ========================================================================= */}
      <main
        className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 my-auto py-6"
        style={{ perspective: '1200px' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* ===================================================================== */}
          {/* A. THE DEAN EXECUTIVE SLATE (Upper Tier · Indigo Aura)                */}
          {/* ===================================================================== */}
          <div
            onMouseEnter={() => {
              setIsHoveringHero(true)
              playClinicalChime(440)
            }}
            onMouseLeave={() => setIsHoveringHero(false)}
            className="md:col-span-12 lg:col-span-10 lg:col-start-2 p-5 sm:p-6 rounded-2xl bg-[#0A1024]/90 border border-indigo-500/30 shadow-2xl shadow-indigo-950/40 backdrop-blur-2xl transition-transform duration-200 ease-out ring-1 ring-indigo-500/20 relative overflow-hidden group"
            style={{
              transform: isHoveringHero
                ? `rotateX(${mousePos.y * -6}deg) rotateY(${mousePos.x * 6}deg) translateZ(25px)`
                : 'none',
            }}
          >
            {/* Top Indigo Glow */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider uppercase text-indigo-300 font-mono">
                      DEAN COMMAND HUB
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                      MASTER KPI
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white">
                    Faculté de Médecine • Central Examination Cockpit
                  </h2>
                </div>
              </div>

              {/* Ticking Milestone Sync */}
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-right">
                  <span className="text-[9px] uppercase font-bold text-indigo-400 block font-mono">
                    Platform Sync
                  </span>
                  <span className="text-sm font-black font-mono text-white">99.4% LIVE</span>
                </div>
                <div className="size-2 rounded-full bg-indigo-400 animate-ping" />
              </div>
            </div>

            {/* KPI Counter Grid */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-indigo-400/80 font-mono block">
                  Configured Stations
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-white">
                  24 <span className="text-xs font-normal text-indigo-300">Active</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-indigo-400/80 font-mono block">
                  Enrolled Cohorts
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-white">
                  6 <span className="text-xs font-normal text-indigo-300">Sections</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-indigo-400/80 font-mono block">
                  Readiness
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  READY <span className="text-xs font-normal text-indigo-300">TO LAUNCH</span>
                </span>
              </div>
            </div>

            {/* 4-Step Milestone Ribbon */}
            <div className="mt-4 pt-3 border-t border-indigo-500/20 flex items-center justify-between text-[11px] font-mono text-indigo-300/80 overflow-x-auto gap-2">
              <span className="flex items-center gap-1 shrink-0 text-white font-bold">
                <Check className="size-3 text-indigo-400" /> 1. Academic Year
              </span>
              <span className="text-indigo-500">→</span>
              <span className="flex items-center gap-1 shrink-0 text-white font-bold">
                <Check className="size-3 text-indigo-400" /> 2. Study Levels
              </span>
              <span className="text-indigo-500">→</span>
              <span className="flex items-center gap-1 shrink-0 text-white font-bold">
                <Check className="size-3 text-indigo-400" /> 3. Modules Provisioned
              </span>
              <span className="text-indigo-500">→</span>
              <span className="flex items-center gap-1 shrink-0 text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                4. Live Assessment
              </span>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* B. THE EVALUATOR TERMINAL SLATE (Mid-Left · Emerald Aura)             */}
          {/* ===================================================================== */}
          <div
            onMouseEnter={() => {
              setIsHoveringHero(true)
              playClinicalChime(520)
            }}
            onMouseLeave={() => setIsHoveringHero(false)}
            className="md:col-span-6 p-5 sm:p-6 rounded-2xl bg-[#061610]/90 border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 backdrop-blur-2xl transition-transform duration-200 ease-out ring-1 ring-emerald-500/20 relative overflow-hidden group"
            style={{
              transform: isHoveringHero
                ? `rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 8 + 4}deg) translateZ(15px)`
                : 'none',
            }}
          >
            {/* Emerald Top Glow */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Stethoscope className="size-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase block">
                    EXAMINER TERMINAL
                  </span>
                  <span className="text-xs font-bold text-white">ST-01 Cardiologie</span>
                </div>
              </div>

              {/* Countdown Timer with SVG Depleting Ring */}
              <div className="flex items-center gap-2 bg-emerald-950/70 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                <Clock className="size-3.5 text-emerald-400 animate-pulse" />
                <span className="font-mono font-black text-sm text-emerald-300">
                  {formatTimer(timerSeconds)}
                </span>
                <span className="text-[9px] font-mono text-emerald-400/80">LEFT</span>
              </div>
            </div>

            {/* Live Masked PIN Chip (Hover Flashes VERIFIED) */}
            <div
              onMouseEnter={() => setPinVerified(true)}
              onMouseLeave={() => setPinVerified(false)}
              className="mt-3.5 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/25 flex items-center justify-between text-xs cursor-pointer transition-colors"
            >
              <span className="text-[11px] font-bold text-emerald-400/80 font-mono">
                Station PIN Gate:
              </span>
              <span
                className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold transition-all ${
                  pinVerified
                    ? 'bg-emerald-500 text-black border border-emerald-300 shadow-md shadow-emerald-500/40'
                    : 'bg-[#0B1A14] text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {pinVerified ? 'VERIFIED ✓' : '•••• 7821'}
              </span>
            </div>

            {/* Checklist items with animated checkmarks */}
            <div className="mt-3.5 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B1A14] border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-slate-200">Patient Greeting & ID Confirm</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-400">+2.0 pts</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B1A14] border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-slate-200">Aseptic Hand Hygiene & Gloves</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-400">+3.0 pts</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B1A14] border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-slate-200">Auscultation of Heart Sounds</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-400">+5.0 pts</span>
              </div>
            </div>

            {/* Station Contribution Readout */}
            <div className="mt-3.5 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Total Station Mark:</span>
              <span className="font-black text-emerald-300 text-sm">18.50 / 20.00 pts</span>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* C. THE ANALYTICAL CANDIDATE SLATE (Mid-Right · Cyan Aura)             */}
          {/* ===================================================================== */}
          <div
            onMouseEnter={() => {
              setIsHoveringHero(true)
              playClinicalChime(660)
            }}
            onMouseLeave={() => setIsHoveringHero(false)}
            className="md:col-span-6 p-5 sm:p-6 rounded-2xl bg-[#051422]/90 border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl transition-transform duration-200 ease-out ring-1 ring-cyan-500/20 relative overflow-hidden group"
            style={{
              transform: isHoveringHero
                ? `rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 8 - 4}deg) translateZ(15px)`
                : 'none',
            }}
          >
            {/* Cyan Top Glow */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <GraduationCap className="size-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase block">
                    CANDIDATE TRANSCRIPT
                  </span>
                  <span className="text-xs font-bold text-white">Nihad BENNACEUR</span>
                </div>
              </div>

              {/* Matricule Tag */}
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold">
                #2026-MED-8491
              </span>
            </div>

            {/* Candidate Result Radial Gauge & Organ Badge */}
            <div className="mt-4 flex items-center justify-between gap-4 p-4 rounded-xl bg-[#0A1828] border border-cyan-500/20">
              {/* Radial Meter */}
              <div className="relative size-20 shrink-0">
                <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="landingCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#0EA5E9" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-[#081525]"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="transparent"
                    stroke="url(#landingCyanGrad)"
                    strokeWidth="8"
                    strokeDasharray={276.46}
                    strokeDashoffset={276.46 - (276.46 * 0.79)} // ~15.80 / 20
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black font-mono text-cyan-300 leading-none">
                    15.80
                  </span>
                  <span className="text-[8px] font-bold text-cyan-400/60 uppercase">/ 20</span>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {/* Beating Heart Icon */}
                  <div className="size-6 rounded-md bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Heart className="size-3.5 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-white truncate">Cardiologie Module</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="size-3 text-emerald-400" />
                    ADMIS (VALIDÉ)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Station Breakdown Matrix */}
            <div className="mt-3.5 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-lg bg-[#0A1828] border border-cyan-500/15">
                <span className="text-[9px] text-slate-400 block">Station 1</span>
                <span className="font-bold text-cyan-300">18.5/20</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0A1828] border border-cyan-500/15">
                <span className="text-[9px] text-slate-400 block">Station 2</span>
                <span className="font-bold text-cyan-300">14.0/20</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0A1828] border border-cyan-500/15">
                <span className="text-[9px] text-slate-400 block">Station 3</span>
                <span className="font-bold text-cyan-300">16.2/20</span>
              </div>
            </div>

            {/* Cryptographic Validated Stamp */}
            <div className="mt-3.5 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[10px] font-mono text-cyan-400/70">
              <span>Examiner Consolidated Record</span>
              <span className="text-emerald-400 font-bold">100% Validated</span>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE AMBIENT FEATURE STRIP & REAL-TIME TICKER                   */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full space-y-4 pt-4 pb-8">
        {/* Organ Specialty Micro-Badges Carousel */}
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center flex-wrap gap-2.5">
            {organs.map((organ) => {
              const OrganIcon = organ.icon
              const isHovered = activeOrganHover === organ.id
              return (
                <button
                  key={organ.id}
                  type="button"
                  onMouseEnter={() => {
                    setActiveOrganHover(organ.id)
                    playClinicalChime(580)
                  }}
                  onMouseLeave={() => setActiveOrganHover(null)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-200 cursor-pointer ${
                    isHovered
                      ? 'bg-white/15 scale-105 shadow-lg border-cyan-400 text-white'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <div className={`size-6 rounded-lg flex items-center justify-center ${organ.color}`}>
                    <OrganIcon className={`size-3.5 ${isHovered ? 'animate-bounce' : ''}`} />
                  </div>
                  <span className="text-xs font-bold font-mono tracking-tight">
                    {organ.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Real-Time Clinical Data Ribbon (Infinite Scrolling Ticker) */}
        <div className="w-full border-y border-white/10 bg-[#080E1C]/80 backdrop-blur-md py-2.5 overflow-hidden flex items-center">
          <div className="flex animate-marquee whitespace-nowrap gap-8 text-[11px] font-mono text-cyan-300/80">
            {[...telemetryFeed, ...telemetryFeed].map((item, idx) => (
              <span key={idx} className="flex items-center gap-3">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{item}</span>
                <span className="text-white/20">///</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. ERGONOMIC FLOATING CONTROLS (AUDIO & THEME TONE SLIDER)                 */}
      {/* ========================================================================= */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 pb-6 flex items-center justify-between text-xs">
        {/* Bottom-Left: Global Soundscape Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !soundEnabled
            setSoundEnabled(next)
            if (next) playClinicalChime(520)
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A1322]/90 border border-white/15 text-slate-300 hover:text-white hover:border-cyan-500/40 backdrop-blur-md transition-all shadow-md cursor-pointer"
          title="Toggle clinical ambient audio soundscape"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="size-3.5 text-cyan-400" />
              <span className="font-mono text-[11px] text-cyan-300">Audio: Clinical Feedback Active</span>
              <span className="flex gap-0.5 items-end h-3">
                <span className="w-0.5 h-2 bg-cyan-400 animate-pulse" />
                <span className="w-0.5 h-3 bg-cyan-400 animate-pulse" />
                <span className="w-0.5 h-1.5 bg-cyan-400 animate-pulse" />
              </span>
            </>
          ) : (
            <>
              <VolumeX className="size-3.5 text-slate-500" />
              <span className="font-mono text-[11px] text-slate-400">Audio: Muted (Click to enable)</span>
            </>
          )}
        </button>

        {/* Bottom-Right: Theme Tone Hue Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#0A1322]/90 border border-white/15 backdrop-blur-md shadow-md text-[10px] font-mono">
          <span className="px-2 text-slate-400">Aura Tone:</span>
          <button
            type="button"
            onClick={() => setActiveHue('all')}
            className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
              activeHue === 'all'
                ? 'bg-white/20 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tricolor
          </button>
          <button
            type="button"
            onClick={() => setActiveHue('indigo')}
            className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
              activeHue === 'indigo'
                ? 'bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/40'
                : 'text-slate-400 hover:text-indigo-300'
            }`}
          >
            Dean
          </button>
          <button
            type="button"
            onClick={() => setActiveHue('emerald')}
            className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
              activeHue === 'emerald'
                ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            Examiner
          </button>
          <button
            type="button"
            onClick={() => setActiveHue('cyan')}
            className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
              activeHue === 'cyan'
                ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            Candidate
          </button>
        </div>
      </div>
    </div>
  )
}
