'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Brain, Droplets, Heart, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'

export interface OsceDoorsFigureProps {
  className?: string
  onScoreChange?: (total: number, passed: boolean) => void
}

interface StationInfo {
  id: string
  name: string
  stationNumber: number
  weight: number
  color: string
  defaultScore: number
  roomType: string
}

const STATIONS: StationInfo[] = [
  {
    id: 'anamnese',
    name: 'Anamnèse',
    stationNumber: 1,
    weight: 35,
    color: '#3B33FF', // Blue
    defaultScore: 16,
    roomType: 'Entretien clinique & Anamnèse',
  },
  {
    id: 'examen',
    name: 'Examen Physique',
    stationNumber: 2,
    weight: 35,
    color: '#E53888', // Magenta
    defaultScore: 15,
    roomType: 'Examen clinique & Manœuvres',
  },
  {
    id: 'urgence',
    name: 'Urgence Médicale',
    stationNumber: 3,
    weight: 30,
    color: '#F97316', // Orange
    defaultScore: 14,
    roomType: 'Chariot d’urgence & Réanimation',
  },
]

const N = 3
const DW = 24, DH = 44, DT = 1.4
const POS_X = [-54, 0, 54]

// Isometric Projection Engine
const rad = (d: number) => (d * Math.PI) / 180
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const r2 = (n: number) => Math.round(n * 100) / 100

function Cam(azDeg: number, k: number, S: number) {
  return { az: rad(azDeg), k, S, ox: 0, oy: 0 }
}

function proj(C: { az: number; k: number; S: number; ox: number; oy: number }) {
  const c = Math.cos(C.az), s = Math.sin(C.az), zf = Math.sqrt(1 - C.k * C.k)
  return (x: number, y: number, z: number): [number, number] => {
    const X = x * c - y * s, Y = x * s + y * c
    return [
      r2(X * C.S + C.ox),
      r2(Y * C.k * C.S - z * zf * C.S + C.oy),
    ]
  }
}

function fit(
  C: { az: number; k: number; S: number; ox: number; oy: number },
  points: [number, number, number][],
  cx: number,
  cy: number
) {
  const P0 = proj({ ...C, ox: 0, oy: 0 })
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y, z] of points) {
    const [sx, sy] = P0(x, y, z)
    if (sx < minX) minX = sx
    if (sx > maxX) maxX = sx
    if (sy < minY) minY = sy
    if (sy > maxY) maxY = sy
  }
  C.ox = cx - (minX + maxX) / 2
  C.oy = cy - (minY + maxY) / 2
}

function rrect(u0: number, v0: number, u1: number, v1: number, r: number, n = 4) {
  r = Math.max(0, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2))
  const out: { u: number; v: number; nu: number; nv: number }[] = []
  for (const [cu, cv, a0] of [
    [u1 - r, v1 - r, 0],
    [u0 + r, v1 - r, 90],
    [u0 + r, v0 + r, 180],
    [u1 - r, v0 + r, 270],
  ]) {
    for (let k = 0; k <= n; k++) {
      const a = rad(a0 + (90 * k) / n), ca = Math.cos(a), sa = Math.sin(a)
      out.push({ u: cu + r * ca, v: cv + r * sa, nu: ca, nv: sa })
    }
  }
  return out
}

function rings(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  b: number
): [any[], any[]] {
  return [
    rrect(x0, y0, x1, y1, r),
    rrect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b)),
  ]
}

function hull(input: [number, number][]): [number, number][] {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo: [number, number][] = [], up: [number, number][] = []
  for (const p of pts) {
    while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop()
    lo.push(p)
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop()
    up.push(p)
  }
  lo.pop()
  up.pop()
  return lo.concat(up)
}

const ringAt = (
  P: (x: number, y: number, z: number) => [number, number],
  ring: { u: number; v: number }[],
  z: number
) => ring.map((q) => P(q.u, q.v, z))

const facing = (C: { az: number }) => {
  const s = Math.sin(C.az), c = Math.cos(C.az)
  return (q: { nu: number; nv: number }) => q.nu * s + q.nv * c >= -1e-6
}

function run(ring: any[], keep: (q: any) => boolean) {
  const n = ring.length
  let s = -1
  for (let i = 0; i < n; i++) {
    if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) {
      s = i
      break
    }
  }
  if (s < 0) return keep(ring[0]) ? ring.slice() : []
  const out = []
  for (let k = 0; k < n && keep(ring[(s + k) % n]); k++) out.push(ring[(s + k) % n])
  return out
}

const poly = (pts: [number, number][]) =>
  'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z'
const openPoly = (pts: [number, number][]) =>
  pts.length < 2 ? '' : 'M' + pts.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')
const seg = (a: [number, number], b: [number, number]) =>
  `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`

function prism(
  P: (x: number, y: number, z: number) => [number, number],
  front: (q: any) => boolean,
  ring: any[],
  inner: any[],
  z0: number,
  z1: number
) {
  return {
    sil: poly(hull(ringAt(P, ring, z1).concat(ringAt(P, ring, z0)))),
    crease: inner ? openPoly(ringAt(P, run(inner, front), z1)) : '',
  }
}

// Ease lift: (.32, .72, 0, 1)
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  function X(t: number) {
    return ((ax * t + bx) * t + cx) * t
  }
  function Y(t: number) {
    return ((ay * t + by) * cy) * t
  }
  return function (t: number) {
    let u = t
    for (let i = 0; i < 16; i++) {
      const x = X(u) - t
      if (Math.abs(x) < 1e-4) break
      const dx = (3 * ax * u + 2 * bx) * u + cx
      if (Math.abs(dx) < 1e-6) break
      u -= x / dx
    }
    return Y(clamp(u, 0, 1))
  }
}
const EASE_SWING = cubicBezier(0.32, 0.72, 0, 1)

export function OsceDoorsFigure({ className = '', onScoreChange }: OsceDoorsFigureProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [activeDoor, setActiveDoor] = useState<number>(-1)
  const [scores, setScores] = useState<number[]>([16, 15, 14])
  const [doorAngles, setDoorAngles] = useState<number[]>([0, 0, 0])

  // Total Grade Calculation (/20 scale)
  const totalGrade = useMemo(() => {
    return (
      STATIONS.reduce(
        (sum, s, idx) => sum + (scores[idx] / 20) * 100 * (s.weight / 100),
        0
      ) * 0.2
    )
  }, [scores])

  const isPassed = totalGrade >= 10.0

  useEffect(() => {
    onScoreChange?.(totalGrade, isPassed)
  }, [totalGrade, isPassed, onScoreChange])

  // Camera & Static Geometry Precomputation
  const {
    P,
    roomGeometries,
    wallPaths,
    corridorLineD,
    passLineD,
    doorFrames,
    signPositions,
    restCenters,
  } = useMemo(() => {
    const C = Cam(45, 0.5, 1.85)
    fit(
      C,
      [
        [-86, 30, 0],
        [86, -30, 0],
        [-86, -32, 54],
        [86, 30, 54],
        [0, 0, 0],
      ],
      200,
      166
    )
    const P = proj(C)
    const front = facing(C)

    // Baseline & 10/20 Pass Datum
    const corridorLineD = seg(P(-82, 0, 0), P(82, 0, 0))
    const passLineD = seg(P(-80, 0, 22), P(80, 0, 22))

    // Dividing Walls Between Rooms (Left, Divider 1, Divider 2, Right, Back)
    const wallPaths = [
      // Back wall backdrop
      poly([P(-74, -26, 0), P(74, -26, 0), P(74, -26, DH + 4), P(-74, -26, DH + 4)]),
      // Left exterior room wall
      prism(P, front, ...rings(-75, -26, -73, 0, 0.8, 0.3), 0, DH + 4).sil,
      // Divider 1 (between Anamnèse & Examen)
      prism(P, front, ...rings(-28, -26, -26, 0, 0.8, 0.3), 0, DH + 4).sil,
      // Divider 2 (between Examen & Urgence)
      prism(P, front, ...rings(26, -26, 28, 0, 0.8, 0.3), 0, DH + 4).sil,
      // Right exterior room wall
      prism(P, front, ...rings(73, -26, 75, 0, 0.8, 0.3), 0, DH + 4).sil,
    ]

    // Room objects solids
    const roomGeometries = []
    const doorFrames = []
    const signPositions = []
    const restCenters: [number, number][] = []

    for (let i = 0; i < N; i++) {
      const cx = POS_X[i]
      const x0 = cx - DW / 2
      const x1 = cx + DW / 2

      // Door frame
      doorFrames.push(openPoly([P(x0, 0, 0), P(x0, 0, DH), P(x1, 0, DH), P(x1, 0, 0)]))

      // Sign position
      const signScreen = P(cx, 0, DH + 5)
      signPositions.push(signScreen)

      // Rest center for hit test
      restCenters.push(P(cx, 0, DH / 2))

      // Clinical Solids per room
      const objects: { sil: string; crease?: string; dot?: [number, number] }[] = []

      if (i === 0) {
        // Station 1: Consultation Chair + Dialogue
        const seat = prism(P, front, ...rings(cx - 6, -20, cx + 6, -10, 2, 0.8), 0, 9)
        const back = prism(P, front, ...rings(cx - 6, -21, cx + 6, -18, 1.5, 0.6), 9, 21)
        const cue = prism(P, front, ...rings(cx - 4, -18, cx + 4, -13, 2, 0.6), 24, 30)
        objects.push(seat, back, cue)
      } else if (i === 1) {
        // Station 2: Examination Plinth + Headrest + Stethoscope
        const tbl = prism(P, front, ...rings(cx - 8, -23, cx + 8, -9, 2.5, 0.8), 0, 11)
        const cush = prism(P, front, ...rings(cx - 8, -23, cx - 1, -9, 2, 0.6), 11, 15)
        const stethDot = P(cx + 3, -16, 12.5)
        objects.push(tbl, cush, { sil: '', dot: stethDot })
      } else {
        // Station 3: Crash Cart + Defibrillator Unit
        const cart = prism(P, front, ...rings(cx - 7, -21, cx + 7, -11, 2, 0.7), 3, 17)
        const mon = prism(P, front, ...rings(cx - 4, -19, cx + 4, -13, 1.5, 0.5), 17, 26)
        objects.push(cart, mon)
      }

      roomGeometries.push({
        cx,
        x0,
        x1,
        objects,
      })
    }

    return {
      P,
      roomGeometries,
      wallPaths,
      corridorLineD,
      passLineD,
      doorFrames,
      signPositions,
      restCenters,
    }
  }, [])

  // Smooth Door Swing Physics Loop
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const tweenTargets = useRef<number[]>([0, 0, 0])
  const tweenStarts = useRef<number[]>([0, 0, 0])
  const tweenDelays = useRef<number[]>([0, 0, 0])

  useEffect(() => {
    const now = Date.now()
    startTimeRef.current = now

    for (let i = 0; i < N; i++) {
      const isPick = i === activeDoor
      const dist = activeDoor < 0 ? 0 : Math.abs(i - activeDoor)
      const targetDeg =
        activeDoor < 0 ? 0 : isPick ? 78 : Math.max(0, 24 - dist * 14)

      tweenStarts.current[i] = doorAngles[i]
      tweenTargets.current[i] = targetDeg
      tweenDelays.current[i] = activeDoor < 0 ? (N - 1 - i) * 30 : dist * 60
    }

    const duration = 650

    const tick = () => {
      const currentNow = Date.now()
      let stillMoving = false
      const nextAngles: number[] = []

      for (let i = 0; i < N; i++) {
        const delay = tweenDelays.current[i]
        const elapsed = currentNow - (startTimeRef.current + delay)
        const p = clamp(elapsed / duration, 0, 1)
        if (p < 1) stillMoving = true

        const eased = EASE_SWING(p)
        const from = tweenStarts.current[i]
        const to = tweenTargets.current[i]
        nextAngles.push(from + (to - from) * eased)
      }

      setDoorAngles(nextAngles)

      if (stillMoving) {
        animRef.current = requestAnimationFrame(tick)
      }
    }

    animRef.current = requestAnimationFrame(tick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [activeDoor])

  // Hit Detection for Door Hover & Click
  const handlePointerAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * 400
      const y = ((clientY - rect.top) / rect.height) * 320

      let best = -1
      let minD = 48
      for (let i = 0; i < N; i++) {
        const d = Math.hypot(x - restCenters[i][0], y - restCenters[i][1])
        if (d < minD) {
          minD = d
          best = i
        }
      }

      if (best !== activeDoor) {
        setActiveDoor(best)
      }
    },
    [activeDoor, restCenters]
  )

  const activeStation = activeDoor >= 0 ? STATIONS[activeDoor] : null

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Live OSCE Deliberation Top Readout */}
      <div className="mb-3 sm:mb-4 w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <span
            className="size-3 rounded-full animate-pulse"
            style={{
              backgroundColor: activeStation ? activeStation.color : '#10B981',
              boxShadow: activeStation
                ? `0 0 12px ${activeStation.color}`
                : '0 0 10px #10B981',
            }}
          />
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {activeStation ? (
                <>
                  <span className="text-emerald-500 font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-bold">
                    STATION {activeStation.stationNumber}
                  </span>
                  <span>{activeStation.name}</span>
                  <span className="text-slate-400 font-normal text-xs">
                    (Poids {activeStation.weight}%)
                  </span>
                </>
              ) : (
                <>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Couloir ECOS • 3 Stations d&apos;Évaluation
                  </span>
                  <span className="text-slate-400 text-xs hidden sm:inline">
                    (Survolez une porte)
                  </span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeStation
                ? activeStation.roomType
                : 'Portes d’examen indépendantes avec cloisons cliniques'}
            </div>
          </div>
        </div>

        {/* Real-time Deliberation Score */}
        <div className="text-right">
          <div className="text-sm sm:text-base font-extrabold tracking-tight flex items-baseline justify-end gap-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {totalGrade.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-400">/20</span>
          </div>
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}
          >
            {isPassed ? 'Admis (Seuil 10/20)' : 'Ajourné (< 10/20)'}
          </div>
        </div>
      </div>

      {/* Main 3D Corridor SVG Stage */}
      <div className="relative w-full max-w-[580px] aspect-[400/320] flex items-center justify-center rounded-3xl bg-slate-50/50 dark:bg-slate-950/40 p-2 border border-slate-200/50 dark:border-slate-800/60 shadow-xl overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 400 320"
          preserveAspectRatio="xMidYMid meet"
          className="size-full overflow-visible touch-none cursor-pointer"
          onPointerMove={(e) => handlePointerAt(e.clientX, e.clientY)}
          onPointerLeave={() => setActiveDoor(-1)}
          onTouchMove={(e) => {
            if (e.touches[0]) {
              handlePointerAt(e.touches[0].clientX, e.touches[0].clientY)
            }
          }}
          onTouchEnd={() => setActiveDoor(-1)}
        >
          <defs>
            {/* Green Exit Sign Glow Filter */}
            <filter id="greenExitGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* Room Light Spill Linear Gradient */}
            <linearGradient id="corridorLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. ROOM WALLS & DIVIDERS (Real Clinical Consultation Rooms) */}
          <g className="transition-opacity duration-300">
            {/* Back room wall plate */}
            <path
              d={wallPaths[0]}
              fill="#0F172A"
              fillOpacity="0.08"
              stroke="#CBD5E1"
              strokeWidth="0.8"
              className="dark:fill-slate-900/60 dark:stroke-slate-800"
            />
            {/* Left exterior partition wall */}
            <path
              d={wallPaths[1]}
              fill="#E2E8F0"
              stroke="#94A3B8"
              strokeWidth="1.1"
              className="dark:fill-slate-800 dark:stroke-slate-700"
            />
            {/* Divider 1 between Station 1 & 2 */}
            <path
              d={wallPaths[2]}
              fill="#E2E8F0"
              stroke="#94A3B8"
              strokeWidth="1.1"
              className="dark:fill-slate-800 dark:stroke-slate-700"
            />
            {/* Divider 2 between Station 2 & 3 */}
            <path
              d={wallPaths[3]}
              fill="#E2E8F0"
              stroke="#94A3B8"
              strokeWidth="1.1"
              className="dark:fill-slate-800 dark:stroke-slate-700"
            />
            {/* Right exterior partition wall */}
            <path
              d={wallPaths[4]}
              fill="#E2E8F0"
              stroke="#94A3B8"
              strokeWidth="1.1"
              className="dark:fill-slate-800 dark:stroke-slate-700"
            />
          </g>

          {/* 10/20 Pass Datum Guide */}
          <g>
            <path
              d={passLineD}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="1"
              strokeDasharray="4 4"
              className="opacity-30"
            />
          </g>

          {/* Corridor Floor Baseline */}
          <path
            d={corridorLineD}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.2"
            className="dark:stroke-slate-700 opacity-60"
          />

          {/* 2. CLINICAL STATIONS & OBJECTS INSIDE ROOMS */}
          {roomGeometries.map((rm, idx) => {
            const st = STATIONS[idx]
            const isHovered = idx === activeDoor
            const angle = doorAngles[idx]

            // Door geometry calculation based on swing angle
            const radTh = rad(angle)
            const cosT = Math.cos(radTh),
              sinT = Math.sin(radTh)
            const xh = rm.x0
            const p0 = [xh, 0],
              p1 = [xh + DW * cosT, -DW * sinT],
              p2 = [xh + DW * cosT + DT * sinT, -DW * sinT + DT * cosT],
              p3 = [xh + DT * sinT, DT * cosT]

            const ptsB = [p0, p1, p2, p3].map(([x, y]) => P(x, y, 0))
            const ptsT = [p0, p1, p2, p3].map(([x, y]) => P(x, y, DH))
            const doorLeafD = poly(hull(ptsT.concat(ptsB)))
            const doorCreaseD = openPoly([ptsT[0], ptsT[1], ptsT[2]])
            const handlePos = P(
              xh + (DW - 3) * cosT + DT * sinT,
              -(DW - 3) * sinT + DT * cosT,
              DH * 0.48
            )

            // Light spill polygon on floor when door opens
            const lightSpillD = poly([
              P(rm.x0, 0, 0),
              P(rm.x1, 0, 0),
              P(rm.x1 + 12 * (angle / 78), 20 * (angle / 78), 0),
              P(rm.x0 - 12 * (angle / 78), 20 * (angle / 78), 0),
            ])

            return (
              <g key={st.id} className="transition-all duration-300">
                {/* Floor light spill when door is open */}
                {angle > 10 && (
                  <path
                    d={lightSpillD}
                    fill={st.color}
                    fillOpacity={(angle / 78) * 0.18}
                    className="pointer-events-none transition-opacity duration-300"
                  />
                )}

                {/* Room Objects (visible inside doorway) */}
                <g
                  className="transition-all duration-300"
                  style={{
                    opacity: isHovered ? 1 : 0.65,
                    filter: isHovered
                      ? `drop-shadow(0 0 10px ${st.color}40)`
                      : 'none',
                  }}
                >
                  {rm.objects.map((obj, oIdx) => (
                    <React.Fragment key={oIdx}>
                      {obj.sil && (
                        <path
                          d={obj.sil}
                          fill="#FFFFFF"
                          stroke={isHovered ? st.color : '#64748B'}
                          strokeWidth="1.2"
                          className="dark:fill-slate-900 transition-colors duration-200"
                        />
                      )}
                      {obj.crease && (
                        <path
                          d={obj.crease}
                          fill="none"
                          stroke={isHovered ? st.color : '#94A3B8'}
                          strokeWidth="0.8"
                          className="transition-colors duration-200"
                        />
                      )}
                      {obj.dot && (
                        <circle
                          cx={obj.dot[0]}
                          cy={obj.dot[1]}
                          r="2.4"
                          fill={st.color}
                          stroke="#FFFFFF"
                          strokeWidth="0.8"
                        />
                      )}
                    </React.Fragment>
                  ))}
                </g>

                {/* Door Frame Surround */}
                <path
                  d={doorFrames[idx]}
                  fill="none"
                  stroke={isHovered ? st.color : '#475569'}
                  strokeWidth={isHovered ? '2' : '1.3'}
                  strokeLinecap="round"
                  className="transition-colors duration-200"
                />

                {/* 3. GREEN HOSPITAL EXIT/STATION SIGN (Authentic Real-Life Signage) */}
                <g
                  className="cursor-pointer"
                  onClick={() => setActiveDoor(idx)}
                >
                  {/* Glowing Signboard Frame Box */}
                  <rect
                    x={signPositions[idx][0] - 18}
                    y={signPositions[idx][1] - 8}
                    width="36"
                    height="13"
                    rx="2.5"
                    fill={isHovered ? '#065F46' : '#064E3B'}
                    stroke={isHovered ? '#34D399' : '#10B981'}
                    strokeWidth={isHovered ? '1.5' : '1'}
                    className="transition-all duration-200"
                    style={{
                      filter: isHovered
                        ? 'drop-shadow(0 0 10px rgba(16,185,129,0.75))'
                        : 'drop-shadow(0 0 4px rgba(16,185,129,0.35))',
                    }}
                  />

                  {/* Little Running Man / Medical Cross Icon */}
                  <circle
                    cx={signPositions[idx][0] - 11.5}
                    cy={signPositions[idx][1] - 1.5}
                    r="1.8"
                    fill={isHovered ? '#A7F3D0' : '#6EE7B7'}
                  />

                  {/* Crisp White/Green "STATION 1 / 2 / 3" Label */}
                  <text
                    x={signPositions[idx][0] + 1.5}
                    y={signPositions[idx][1] + 1}
                    textAnchor="middle"
                    fill={isHovered ? '#FFFFFF' : '#A7F3D0'}
                    fontSize="5.2"
                    fontWeight="800"
                    fontFamily="monospace"
                    letterSpacing="0.08em"
                    className="select-none pointer-events-none transition-colors duration-200"
                  >
                    STATION {st.stationNumber}
                  </text>
                </g>

                {/* 4. SOLID DOOR LEAF (Pivoting into room) */}
                <path
                  d={doorLeafD}
                  fill={isHovered ? '#FFFFFF' : '#F8FAFC'}
                  stroke={isHovered ? st.color : '#334155'}
                  strokeWidth={isHovered ? '1.8' : '1.2'}
                  strokeLinejoin="round"
                  className="dark:fill-slate-900 transition-colors duration-200"
                />
                {doorCreaseD && (
                  <path
                    d={doorCreaseD}
                    fill="none"
                    stroke={isHovered ? st.color : '#94A3B8'}
                    strokeWidth="0.8"
                    className="transition-colors duration-200"
                  />
                )}

                {/* Door Handle */}
                <circle
                  cx={handlePos[0]}
                  cy={handlePos[1]}
                  r="1.8"
                  fill={isHovered ? st.color : '#64748B'}
                  stroke="#FFFFFF"
                  strokeWidth="0.7"
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* Interactive Bottom Station Cards with Sliders */}
      <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-[580px]">
        {STATIONS.map((s, idx) => {
          const isSelected = activeDoor === idx
          const score = scores[idx]

          return (
            <div
              key={s.id}
              onMouseEnter={() => setActiveDoor(idx)}
              onMouseLeave={() => setActiveDoor(-1)}
              className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 shadow-lg scale-[1.02]'
                  : 'bg-white/60 dark:bg-slate-900/50 hover:bg-white/90 dark:hover:bg-slate-900/80'
              }`}
              style={{
                borderColor: isSelected ? s.color : 'rgba(148, 163, 184, 0.25)',
                boxShadow: isSelected ? `0 10px 25px -5px ${s.color}25` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: s.color }}
                  >
                    STATION {s.stationNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {s.name}
                  </span>
                </div>
                <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">
                  {score}
                  <span className="text-[10px] text-slate-400 font-normal">/20</span>
                </span>
              </div>

              {/* Slider for station score */}
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={score}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setScores((prev) =>
                    prev.map((sc, i) => (i === idx ? val : sc))
                  )
                }}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-ew-resize accent-[#3B33FF]"
                style={{ accentColor: s.color }}
              />

              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                <span>Poids: {s.weight}%</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  +{(score * (s.weight / 100)).toFixed(1)} / {(20 * (s.weight / 100)).toFixed(1)} pts
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
