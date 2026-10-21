'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'

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
  description: string
}

const STATIONS: StationInfo[] = [
  {
    id: 'anamnese',
    name: 'Anamnèse & Entretien',
    stationNumber: 1,
    weight: 35,
    color: '#3B33FF', // Clinical Blue
    defaultScore: 16,
    roomType: 'Bureau Médical & Patient Assis',
    description: 'Poste informatique d’évaluation avec patient simulé en consultation',
  },
  {
    id: 'cpr',
    name: 'Examen & Réanimation CPR',
    stationNumber: 2,
    weight: 35,
    color: '#E53888', // Magenta / Pulse
    defaultScore: 15,
    roomType: 'Poste PC & Mannequin CPR',
    description: 'Table d’examen avec mannequin de réanimation cardio-pulmonaire',
  },
  {
    id: 'urgence',
    name: 'Urgence & Déchocage',
    stationNumber: 3,
    weight: 30,
    color: '#F97316', // Emergency Orange
    defaultScore: 14,
    roomType: 'Poste PC & Chariot d’Urgence',
    description: 'Chariot d’urgence mobile avec défibrillateur et tige à perfusion',
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

export function OsceDoorsFigure({ className = '', onScoreChange }: OsceDoorsFigureProps) {
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
    hitZones,
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

    // Dividing Walls Between Rooms (Solid Hospital Walls)
    const wallPaths = [
      // Back wall of the rooms
      poly([P(-74, -26, 0), P(74, -26, 0), P(74, -26, DH + 4), P(-74, -26, DH + 4)]),
      // Left exterior wall
      prism(P, front, ...rings(-75, -26, -73, 0, 0.8, 0.3), 0, DH + 4).sil,
      // Divider 1 (between Station 1 & 2)
      prism(P, front, ...rings(-28, -26, -26, 0, 0.8, 0.3), 0, DH + 4).sil,
      // Divider 2 (between Station 2 & 3)
      prism(P, front, ...rings(26, -26, 28, 0, 0.8, 0.3), 0, DH + 4).sil,
      // Right exterior wall
      prism(P, front, ...rings(73, -26, 75, 0, 0.8, 0.3), 0, DH + 4).sil,
    ]

    const roomGeometries = []
    const doorFrames = []
    const signPositions: [number, number][] = []

    // 3 Discrete, non-overlapping hit zones partitioned along room divider walls
    const hitZones = [
      { x: 0, y: 20, w: 164, h: 280 },
      { x: 164, y: 20, w: 71, h: 280 },
      { x: 235, y: 20, w: 165, h: 280 },
    ]

    for (let i = 0; i < N; i++) {
      const cx = POS_X[i]
      const x0 = cx - DW / 2
      const x1 = cx + DW / 2

      doorFrames.push(openPoly([P(x0, 0, 0), P(x0, 0, DH), P(x1, 0, DH), P(x1, 0, 0)]))
      signPositions.push(P(cx, 0, DH + 5))

      // =====================================================================
      // 1. DESK & PC SETUP (Standard Examiner Desktop inside each room)
      // =====================================================================
      const objects: { sil: string; crease?: string; color?: string; type?: string; p1?: [number, number]; p2?: [number, number] }[] = []

      // Desk Table
      const desk = prism(P, front, ...rings(cx - 9, -21, cx - 1, -12, 1.5, 0.5), 0, 9)
      // PC Monitor Base & Screen
      const monitorBase = prism(P, front, ...rings(cx - 6, -17, cx - 4, -15, 0.8, 0.3), 9, 10.5)
      const monitorScreen = prism(P, front, ...rings(cx - 7.5, -17.5, cx - 2.5, -16.5, 0.6, 0.2), 10.5, 17.5)
      // PC Keyboard
      const keyboard = prism(P, front, ...rings(cx - 7, -15, cx - 3, -13, 0.5, 0.2), 9, 9.8)
      objects.push(desk, monitorBase, monitorScreen, keyboard)

      // =====================================================================
      // 2. CLINICAL SPECIALTY MEDICAL EQUIPMENT PER ROOM
      // =====================================================================
      if (i === 0) {
        // ROOM 1: Patient Consultation Chair + Patient Seated Figure
        const chairSeat = prism(P, front, ...rings(cx + 2, -20, cx + 8, -12, 1.8, 0.6), 0, 7.5)
        const chairBack = prism(P, front, ...rings(cx + 6.5, -20, cx + 8, -12, 0.8, 0.3), 7.5, 16.5)
        const patientTorso = prism(P, front, ...rings(cx + 2.5, -19, cx + 6.5, -13, 1.5, 0.5), 7.5, 15.5)
        const patientHead = prism(P, front, ...rings(cx + 3.2, -18, cx + 6, -14, 1.2, 0.4), 15.5, 20.5)
        // Speech Dialogue Ring Cue
        const dialogueRing = prism(P, front, ...rings(cx + 2, -18, cx + 7.5, -14, 1.5, 0.4), 23, 28)
        objects.push(chairSeat, chairBack, patientTorso, patientHead, dialogueRing)
      } else if (i === 1) {
        // ROOM 2: CPR Examination Table + Resuscitation Mannequin
        const examPlinth = prism(P, front, ...rings(cx + 1, -23, cx + 9, -9, 2, 0.6), 0, 8.5)
        // Mannequin Torso & Head lying flat
        const cprTorso = prism(P, front, ...rings(cx + 2.2, -20, cx + 7.8, -12, 1.5, 0.5), 8.5, 12.5)
        const cprHead = prism(P, front, ...rings(cx + 3.2, -22.5, cx + 6.8, -20, 1.2, 0.4), 8.5, 12)
        const cprLegs = prism(P, front, ...rings(cx + 3, -12, cx + 7, -9.5, 1.1, 0.4), 8.5, 11)
        // Cardiac monitor ECG wave indicator
        const ecgLine = {
          sil: '',
          type: 'line',
          p1: P(cx + 2, -16, 17),
          p2: P(cx + 8, -16, 17),
        }
        objects.push(examPlinth, cprTorso, cprHead, cprLegs, ecgLine)
      } else {
        // ROOM 3: Emergency Crash Cart + Defibrillator Unit + IV Pole
        const crashCart = prism(P, front, ...rings(cx + 2, -22, cx + 8, -12, 1.8, 0.6), 2, 15.5)
        const defibMonitor = prism(P, front, ...rings(cx + 3, -20, cx + 7, -14, 1.2, 0.4), 15.5, 22.5)
        // IV Pole vertical rod & drip hanger
        const ivPole = {
          sil: '',
          type: 'line',
          p1: P(cx + 8.5, -11, 2),
          p2: P(cx + 8.5, -11, 33),
        }
        const ivHanger = {
          sil: '',
          type: 'line',
          p1: P(cx + 7, -11, 32),
          p2: P(cx + 10, -11, 32),
        }
        objects.push(crashCart, defibMonitor, ivPole, ivHanger)
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
      hitZones,
    }
  }, [])

  // Smooth Stable Door Swing (Lerp-based, absolutely ZERO jitter)
  useEffect(() => {
    let animId: number
    const targetAngles = [0, 0, 0]

    if (activeDoor >= 0) {
      for (let i = 0; i < N; i++) {
        const dist = Math.abs(i - activeDoor)
        // Active door opens 60 degrees cleanly, neighbors crack 8 degrees
        targetAngles[i] = dist === 0 ? 60 : dist === 1 ? 8 : 0
      }
    }

    const update = () => {
      let isMoving = false
      setDoorAngles((prev) => {
        return prev.map((cur, i) => {
          const target = targetAngles[i]
          const diff = target - cur
          if (Math.abs(diff) > 0.15) {
            isMoving = true
            return cur + diff * 0.22
          }
          return target
        })
      })

      if (isMoving) {
        animId = requestAnimationFrame(update)
      }
    }

    animId = requestAnimationFrame(update)
    return () => {
      if (animId) cancelAnimationFrame(animId)
    }
  }, [activeDoor])

  const activeStation = activeDoor >= 0 ? STATIONS[activeDoor] : null

  return (
    <div
      className={`relative flex flex-col items-center select-none ${className}`}
      onMouseLeave={() => setActiveDoor(-1)}
    >
      {/* Top Clinical Readout Card (Light Medical Palette) */}
      <div className="mb-3 sm:mb-4 w-full flex items-center justify-between px-4 sm:px-5 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span
            className="size-3 rounded-full transition-colors duration-300"
            style={{
              backgroundColor: activeStation ? activeStation.color : '#10B981',
              boxShadow: activeStation
                ? `0 0 10px ${activeStation.color}`
                : '0 0 8px #10B981',
            }}
          />
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              {activeStation ? (
                <>
                  <span className="text-emerald-700 font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-bold">
                    STATION {activeStation.stationNumber}
                  </span>
                  <span>{activeStation.name}</span>
                  <span className="text-slate-400 font-normal text-xs">
                    (Poids {activeStation.weight}%)
                  </span>
                </>
              ) : (
                <>
                  <span className="text-emerald-700 font-semibold">
                    Couloir ECOS Clinique • 3 Stations d&apos;Évaluation
                  </span>
                  <span className="text-slate-400 text-xs hidden sm:inline">
                    (Passez la souris sur une porte pour l&apos;ouvrir)
                  </span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {activeStation
                ? `${activeStation.roomType} — ${activeStation.description}`
                : 'Cloisons médicales séparées • Bureau & PC dans chaque salle'}
            </div>
          </div>
        </div>

        {/* Real-time Deliberation Score */}
        <div className="text-right">
          <div className="text-sm sm:text-base font-extrabold tracking-tight flex items-baseline justify-end gap-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
              {totalGrade.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-400">/20</span>
          </div>
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isPassed ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {isPassed ? 'Admis (Seuil 10/20)' : 'Ajourné (< 10/20)'}
          </div>
        </div>
      </div>

      {/* Main 3D Corridor SVG Stage (Clean Crisp Light Hospital Aesthetic) */}
      <div
        className="relative w-full max-w-[580px] aspect-[400/320] flex items-center justify-center rounded-3xl bg-white p-2 border border-slate-200 shadow-md overflow-hidden"
        onMouseLeave={() => setActiveDoor(-1)}
      >
        <svg
          viewBox="0 0 400 320"
          preserveAspectRatio="xMidYMid meet"
          className="size-full overflow-visible"
          onMouseLeave={() => setActiveDoor(-1)}
        >
          {/* 1. SOLID HOSPITAL ROOM WALLS & PARTITIONS */}
          <g>
            {/* Back Wall */}
            <path
              d={wallPaths[0]}
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="0.9"
            />
            {/* Divider Walls */}
            <path d={wallPaths[1]} fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
            <path d={wallPaths[2]} fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
            <path d={wallPaths[3]} fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
            <path d={wallPaths[4]} fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
          </g>

          {/* 10/20 Pass Datum Benchmark Guide Line */}
          <path
            d={passLineD}
            fill="none"
            stroke="#06B6D4"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="opacity-40"
          />

          {/* Corridor Floor Baseline */}
          <path
            d={corridorLineD}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.2"
            className="opacity-50"
          />

          {/* 2. ROOM OBJECTS (Desk + PC + Medical Element) */}
          {roomGeometries.map((rm, idx) => {
            const st = STATIONS[idx]
            const isHovered = idx === activeDoor
            const angle = doorAngles[idx]

            // Door Geometry
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

            // Light Spill Polygon on Floor
            const lightSpillD = poly([
              P(rm.x0, 0, 0),
              P(rm.x1, 0, 0),
              P(rm.x1 + 14 * (angle / 65), 18 * (angle / 65), 0),
              P(rm.x0 - 14 * (angle / 65), 18 * (angle / 65), 0),
            ])

            return (
              <g key={st.id} className="pointer-events-none">
                {/* Light Spill when door opens */}
                {angle > 5 && (
                  <path
                    d={lightSpillD}
                    fill={st.color}
                    fillOpacity={(angle / 65) * 0.15}
                    className="transition-opacity duration-200"
                  />
                )}

                {/* Desk + PC + Medical Equipment inside Room */}
                <g
                  style={{
                    opacity: isHovered ? 1 : 0.7,
                  }}
                >
                  {rm.objects.map((obj, oIdx) => (
                    <React.Fragment key={oIdx}>
                      {obj.sil && (
                        <path
                          d={obj.sil}
                          fill="#FFFFFF"
                          stroke={isHovered ? st.color : '#64748B'}
                          strokeWidth="1.1"
                          strokeLinejoin="round"
                        />
                      )}
                      {obj.crease && (
                        <path
                          d={obj.crease}
                          fill="none"
                          stroke={isHovered ? st.color : '#CBD5E1'}
                          strokeWidth="0.7"
                        />
                      )}
                      {obj.type === 'line' && obj.p1 && obj.p2 && (
                        <line
                          x1={obj.p1[0]}
                          y1={obj.p1[1]}
                          x2={obj.p2[0]}
                          y2={obj.p2[1]}
                          stroke={isHovered ? st.color : '#64748B'}
                          strokeWidth="1.2"
                        />
                      )}
                    </React.Fragment>
                  ))}
                </g>

                {/* Door Frame */}
                <path
                  d={doorFrames[idx]}
                  fill="none"
                  stroke={isHovered ? st.color : '#64748B'}
                  strokeWidth={isHovered ? '2' : '1.3'}
                  strokeLinecap="round"
                />

                {/* 3. GREEN HOSPITAL EXIT-STYLE SIGNBOARD (Real-Life Signage) */}
                <g>
                  {/* Glowing Green Sign Plate */}
                  <rect
                    x={signPositions[idx][0] - 18}
                    y={signPositions[idx][1] - 8}
                    width="36"
                    height="13"
                    rx="2"
                    fill={isHovered ? '#047857' : '#065F46'}
                    stroke={isHovered ? '#34D399' : '#10B981'}
                    strokeWidth="1.2"
                    style={{
                      filter: isHovered
                        ? 'drop-shadow(0 0 6px rgba(16,185,129,0.7))'
                        : 'drop-shadow(0 0 2px rgba(16,185,129,0.3))',
                    }}
                  />
                  {/* Emergency Run/Cross Dot */}
                  <circle
                    cx={signPositions[idx][0] - 11.5}
                    cy={signPositions[idx][1] - 1.5}
                    r="1.7"
                    fill="#A7F3D0"
                  />
                  {/* Crisp White/Green "STATION 1 / 2 / 3" Text */}
                  <text
                    x={signPositions[idx][0] + 1.5}
                    y={signPositions[idx][1] + 1}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="5.2"
                    fontWeight="800"
                    fontFamily="monospace"
                    letterSpacing="0.08em"
                    className="select-none"
                  >
                    STATION {st.stationNumber}
                  </text>
                </g>

                {/* 4. SOLID DOOR LEAF (Pivots inward smoothly) */}
                <path
                  d={doorLeafD}
                  fill="#FFFFFF"
                  stroke={isHovered ? st.color : '#334155'}
                  strokeWidth={isHovered ? '1.8' : '1.2'}
                  strokeLinejoin="round"
                />
                {doorCreaseD && (
                  <path
                    d={doorCreaseD}
                    fill="none"
                    stroke={isHovered ? st.color : '#CBD5E1'}
                    strokeWidth="0.8"
                  />
                )}
                {/* Door Handle */}
                <circle
                  cx={handlePos[0]}
                  cy={handlePos[1]}
                  r="1.7"
                  fill={isHovered ? st.color : '#64748B'}
                  stroke="#FFFFFF"
                  strokeWidth="0.6"
                />
              </g>
            )
          })}

          {/* 5. STATIC INVISIBLE HIT TARGETS (Eliminates ALL crazy spinning/flicker) */}
          {hitZones.map((zone, idx) => (
            <rect
              key={idx}
              x={zone.x}
              y={zone.y}
              width={zone.w}
              height={zone.h}
              fill="transparent"
              className="cursor-pointer pointer-events-auto"
              onMouseEnter={() => setActiveDoor(idx)}
              onClick={() => setActiveDoor((prev) => (prev === idx ? -1 : idx))}
            />
          ))}
        </svg>
      </div>

      {/* Interactive Station Sliders (Light Medical Palette) */}
      <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-[580px]">
        {STATIONS.map((s, idx) => {
          const isSelected = activeDoor === idx
          const score = scores[idx]

          return (
            <div
              key={s.id}
              onMouseEnter={() => setActiveDoor(idx)}
              className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-white shadow-md border-slate-300 ring-2 ring-slate-100'
                  : 'bg-white/80 hover:bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: s.color }}
                  >
                    STATION {s.stationNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {s.name}
                  </span>
                </div>
                <span className="text-xs font-mono font-extrabold text-slate-900">
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
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-ew-resize"
                style={{ accentColor: s.color }}
              />

              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                <span>Poids: {s.weight}%</span>
                <span className="font-semibold text-slate-700">
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
