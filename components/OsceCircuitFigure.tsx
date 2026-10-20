'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'

export interface OsceCircuitFigureProps {
  activeStationId?: string | null
  onStationHover?: (id: string | null) => void
  className?: string
}

interface StationConfig {
  id: string
  name: string
  label: string
  weight: number
  height: number
  score: string
  accentColor: string
  glowClass: string
}

const STATIONS: StationConfig[] = [
  {
    id: 'cardio',
    name: 'Cardiologie',
    label: 'STATION 1',
    weight: 6.0,
    height: 26,
    score: '+4.8',
    accentColor: '#F43F5E', // Rose
    glowClass: 'shadow-[0_0_25px_rgba(244,63,94,0.4)]',
  },
  {
    id: 'neuro',
    name: 'Neurologie',
    label: 'STATION 2',
    weight: 4.0,
    height: 18,
    score: '+3.2',
    accentColor: '#6366F1', // Indigo
    glowClass: 'shadow-[0_0_25px_rgba(99,102,241,0.4)]',
  },
  {
    id: 'pneumo',
    name: 'Pneumologie',
    label: 'STATION 3',
    weight: 5.0,
    height: 22,
    score: '+3.8',
    accentColor: '#06B6D4', // Cyan
    glowClass: 'shadow-[0_0_25px_rgba(6,182,212,0.4)]',
  },
  {
    id: 'nephro',
    name: 'Néphrologie',
    label: 'STATION 4',
    weight: 5.0,
    height: 22,
    score: '+3.7',
    accentColor: '#10B981', // Emerald
    glowClass: 'shadow-[0_0_25px_rgba(16,185,129,0.4)]',
  },
]

const N = 4
const POS: [number, number][] = [
  [-56, 42],
  [-19, 15],
  [19, -15],
  [56, -42],
]
const RW = 12, RL = 12, CR = 3.6, INSET = 1.4
const BEAD_OFFSETS: [number, number][] = [
  [-4.4, 4.4],
  [0, 0],
  [4.4, -4.4],
]

// =========================================================================
// ISOMETRIC GEOMETRY CORE (Hairline Math Engine)
// =========================================================================
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

function rings(x0: number, y0: number, x1: number, y1: number, r: number, b: number) {
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

// Cubic bezier lift easing: (.32, .72, 0, 1)
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
const EASE_LIFT = cubicBezier(0.32, 0.72, 0, 1)

export function OsceCircuitFigure({
  activeStationId,
  onStationHover,
  className = '',
}: OsceCircuitFigureProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [internalHover, setInternalHover] = useState<number>(-1)
  const [reducedMotion, setReducedMotion] = useState(false)

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Sync external prop with internal index
  const activeIndex = useMemo(() => {
    if (activeStationId) {
      const idx = STATIONS.findIndex((s) => s.id === activeStationId)
      if (idx >= 0) return idx
    }
    return internalHover
  }, [activeStationId, internalHover])

  // Camera projection precomputation
  const { P, passLineD, trackD, stationGeometries, restCenters } = useMemo(() => {
    const C = Cam(45, 0.5, 1.82)
    fit(
      C,
      [
        [-78, 62, -3],
        [78, -62, -3],
        [-78, 62, 54],
        [78, -62, 54],
        [0, 0, 0],
      ],
      200,
      166
    )
    const P = proj(C)
    const front = facing(C)

    const passLineD = seg(P(-76, 58, 14), P(76, -58, 14))
    const trackPts = POS.map(([x, y]) => P(x, y, 0))
    const trackD = openPoly(trackPts)

    const stationGeometries = []
    const restCenters: [number, number][] = []

    for (let i = 0; i < N; i++) {
      const [cx, cy] = POS[i]
      const cfg = STATIONS[i]
      const [outer, inner] = rings(cx - RW, cy - RL, cx + RW, cy + RL, CR, INSET)
      const paths = prism(P, front, outer, inner, 0, cfg.height)
      const centerScreen = P(cx, cy, cfg.height)
      restCenters.push(centerScreen)
      stationGeometries.push({
        paths,
        cx,
        cy,
        height: cfg.height,
        centerScreen,
      })
    }

    return { P, passLineD, trackD, stationGeometries, restCenters }
  }, [])

  // Animation spring/tween state for bead heights
  const [beadHeights, setBeadHeights] = useState<number[][]>(() =>
    STATIONS.map((s) => BEAD_OFFSETS.map(() => s.height + 2.8))
  )

  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const tweenTargets = useRef<number[][]>(
    STATIONS.map((s) => BEAD_OFFSETS.map(() => s.height + 2.8))
  )
  const tweenStarts = useRef<number[][]>(
    STATIONS.map((s) => BEAD_OFFSETS.map(() => s.height + 2.8))
  )
  const tweenDelays = useRef<number[][]>(
    STATIONS.map((s) => BEAD_OFFSETS.map(() => 0))
  )

  // Trigger animation whenever active station changes
  useEffect(() => {
    const now = Date.now()
    startTimeRef.current = now

    for (let i = 0; i < N; i++) {
      const st = STATIONS[i]
      const isPick = i === activeIndex
      const dist = activeIndex < 0 ? 0 : Math.abs(i - activeIndex)
      const neighborLift = activeIndex < 0 ? 0 : Math.max(0, 18 - dist * 7)

      for (let b = 0; b < BEAD_OFFSETS.length; b++) {
        tweenStarts.current[i][b] = beadHeights[i][b]
        const target = st.height + 2.8 + (isPick ? 22 + b * 4 : neighborLift)
        tweenTargets.current[i][b] = target
        const delay =
          activeIndex < 0 ? (N - 1 - i) * 35 + b * 20 : dist * 50 + b * 45
        tweenDelays.current[i][b] = delay
      }
    }

    if (reducedMotion) {
      setBeadHeights(tweenTargets.current.map((row) => [...row]))
      return
    }

    const duration = 700

    const tick = () => {
      const currentNow = Date.now()
      let stillMoving = false
      const nextHeights: number[][] = []

      for (let i = 0; i < N; i++) {
        const row: number[] = []
        for (let b = 0; b < BEAD_OFFSETS.length; b++) {
          const delay = tweenDelays.current[i][b]
          const elapsed = currentNow - (startTimeRef.current + delay)
          const p = clamp(elapsed / duration, 0, 1)
          if (p < 1) stillMoving = true

          const eased = EASE_LIFT(p)
          const from = tweenStarts.current[i][b]
          const to = tweenTargets.current[i][b]
          row.push(from + (to - from) * eased)
        }
        nextHeights.push(row)
      }

      setBeadHeights(nextHeights)

      if (stillMoving) {
        animRef.current = requestAnimationFrame(tick)
      }
    }

    animRef.current = requestAnimationFrame(tick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [activeIndex, reducedMotion])

  // Hit testing against static station rest centers
  const handlePointerAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * 400
      const y = ((clientY - rect.top) / rect.height) * 320

      let best = -1
      let minD = 48
      for (let i = 0; i < N; i++) {
        const [sx, sy] = restCenters[i]
        const d = Math.hypot(x - sx, y - sy)
        if (d < minD) {
          minD = d
          best = i
        }
      }

      if (best !== internalHover) {
        setInternalHover(best)
        onStationHover?.(best >= 0 ? STATIONS[best].id : null)
      }
    },
    [internalHover, onStationHover, restCenters]
  )

  const handlePointerLeave = useCallback(() => {
    setInternalHover(-1)
    onStationHover?.(null)
  }, [onStationHover])

  // Active station details for readout
  const activeStation = activeIndex >= 0 ? STATIONS[activeIndex] : null

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Dynamic OSCE Readout HUD Pill */}
      <div className="mb-2 sm:mb-3 flex items-center justify-center">
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-xl shadow-lg transition-all duration-300">
          <span
            className="size-2 rounded-full transition-colors duration-300"
            style={{
              backgroundColor: activeStation ? activeStation.accentColor : '#06B6D4',
              boxShadow: activeStation
                ? `0 0 10px ${activeStation.accentColor}`
                : '0 0 8px rgba(6,182,212,0.6)',
            }}
          />
          <div className="text-xs sm:text-sm font-mono tracking-tight text-slate-300 flex items-center gap-2">
            {activeStation ? (
              <>
                <span className="font-semibold text-white">{activeStation.name}</span>
                <span className="text-cyan-400 font-bold">{activeStation.score}</span>
                <span className="text-slate-500">/ {activeStation.weight.toFixed(1)} pts</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400 font-medium">Delib: 15.5/20</span>
                <span className="hidden sm:inline text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Admis
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-400">OSCE Deliberation</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400 font-medium">Total: 15.5 / 20.0</span>
                <span className="text-slate-600">·</span>
                <span className="text-cyan-400/90 text-xs">Seuil: 10/20</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Isometric SVG Stage */}
      <div className="relative w-full max-w-[420px] sm:max-w-[520px] md:max-w-[580px] aspect-[400/310] flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 400 320"
          preserveAspectRatio="xMidYMid meet"
          className="size-full overflow-visible touch-none cursor-pointer filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
          onPointerMove={(e) => handlePointerAt(e.clientX, e.clientY)}
          onPointerLeave={handlePointerLeave}
          onTouchMove={(e) => {
            if (e.touches[0]) {
              handlePointerAt(e.touches[0].clientX, e.touches[0].clientY)
            }
          }}
          onTouchEnd={handlePointerLeave}
        >
          {/* Subtle Ambient Floor Sheen */}
          <ellipse
            cx="200"
            cy="180"
            rx="180"
            ry="75"
            fill="radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)"
            className="pointer-events-none opacity-40"
          />

          {/* 10/20 Pass Datum Guide Line */}
          <g className="transition-opacity duration-300">
            <path
              d={passLineD}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              className="opacity-40"
            />
            {/* Datum line annotation mark */}
            <text
              x="295"
              y="112"
              fill="#06B6D4"
              fontSize="7.5"
              fontFamily="monospace"
              className="opacity-70 select-none tracking-widest uppercase font-semibold"
            >
              10/20 PASS
            </text>
          </g>

          {/* Ground Circuit Track */}
          <path
            d={trackD}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="3 3"
            className="opacity-40"
          />

          {/* 4 OSCE Station Trays and Beads (Back-to-Front Depth Order) */}
          {stationGeometries.map((geom, idx) => {
            const st = STATIONS[idx]
            const isPick = idx === activeIndex
            const isHovered = isPick

            return (
              <g
                key={st.id}
                className="transition-all duration-300"
                style={{
                  filter: isHovered
                    ? `drop-shadow(0 0 12px ${st.accentColor}55)`
                    : 'none',
                }}
              >
                {/* Tray Solid Silhouette & Crease */}
                <path
                  d={geom.paths.sil}
                  fill="#070E18"
                  stroke={isHovered ? st.accentColor : '#334155'}
                  strokeWidth={isHovered ? '2' : '1.3'}
                  strokeLinejoin="round"
                  className="transition-colors duration-200"
                />
                {geom.paths.crease && (
                  <path
                    d={geom.paths.crease}
                    fill="none"
                    stroke={isHovered ? st.accentColor : '#1E293B'}
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    className="transition-colors duration-200 opacity-80"
                  />
                )}

                {/* Score Beads inside/above Tray */}
                {BEAD_OFFSETS.map(([ox, oy], bIdx) => {
                  const z = beadHeights[idx]?.[bIdx] ?? geom.height + 2.8
                  const [bx, by] = P(geom.cx + ox, geom.cy + oy, z)

                  return (
                    <g key={bIdx} className="pointer-events-none">
                      {/* Bead Ground Reflection / Shadow */}
                      {isHovered && (
                        <circle
                          cx={bx}
                          cy={by + 6}
                          r="2.2"
                          fill="rgba(0,0,0,0.4)"
                          className="blur-[1px]"
                        />
                      )}

                      {/* Main Awarded Score Bead */}
                      <circle
                        cx={bx}
                        cy={by}
                        r={isHovered ? '3.5' : '2.9'}
                        fill={isHovered ? st.accentColor : '#475569'}
                        stroke={isHovered ? '#FFFFFF' : '#0F172A'}
                        strokeWidth={isHovered ? '1.2' : '0.8'}
                        className="transition-all duration-200"
                        style={{
                          filter: isHovered
                            ? `drop-shadow(0 0 6px ${st.accentColor})`
                            : 'none',
                        }}
                      />
                    </g>
                  )
                })}

                {/* Station Badge Label on Front Rim */}
                <text
                  x={geom.centerScreen[0]}
                  y={geom.centerScreen[1] + 20}
                  textAnchor="middle"
                  fill={isHovered ? st.accentColor : '#64748B'}
                  fontSize="7.5"
                  fontFamily="sans-serif"
                  fontWeight="600"
                  letterSpacing="0.08em"
                  className="transition-colors duration-200 pointer-events-none select-none uppercase"
                >
                  {st.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
