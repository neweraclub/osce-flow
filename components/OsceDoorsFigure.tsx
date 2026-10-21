'use client'

import React, { useState, useEffect, useMemo } from 'react'

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
    name: 'Anamnèse & Consultation',
    stationNumber: 1,
    weight: 35,
    color: '#3B33FF', // Clinical Blue
    defaultScore: 16,
    roomType: 'Bureau Praticien & Consultation Patient',
    description: 'Poste informatique d’évaluation avec bureau exécutif, PC et patient simulé en anamnèse',
  },
  {
    id: 'cpr',
    name: 'Examen Clinique & Réanimation CPR',
    stationNumber: 2,
    weight: 35,
    color: '#E53888', // Magenta / Pulse
    defaultScore: 15,
    roomType: 'Poste PC & Salle de Réanimation CPR',
    description: 'Poste informatique, lit d’examen avec mannequin de réanimation et moniteur de rythme',
  },
  {
    id: 'urgence',
    name: 'Urgence Médicale & Déchocage',
    stationNumber: 3,
    weight: 30,
    color: '#F97316', // Emergency Orange
    defaultScore: 14,
    roomType: 'Poste PC & Baie d’Urgence Mobile',
    description: 'Poste informatique, chariot d’urgence avec défibrillateur et tige à perfusion',
  },
]

const N = 3
// Room centers: -62, 0, 62
const POS_X = [-62, 0, 62]
// Exact same height for doors and room walls
const WH = 28 // Wall height
const DH = 28 // Door height (EXACTLY same size as room wall)
const DW = 22 // Door width (swings cleanly along partition wall)
const DT = 1.2
const RD = 30 // Room depth (from y = -30 to y = 0)

// Room partition X coordinates
const ROOM_WALLS = [
  { left: -93, right: -31, cx: -62 },
  { left: -31, right: 31, cx: 0 },
  { left: 31, right: 93, cx: 62 },
]

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
  // REST STATE: Doors rest slightly ajar at 28° so offices are open, never closed stalls!
  const [doorAngles, setDoorAngles] = useState<number[]>([28, 28, 28])

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
    backWallPath,
    partitionPaths,
    roomFloors,
    headerBeams,
    signPositions,
    hitZones,
  } = useMemo(() => {
    const C = Cam(35, 0.5, 2.05)
    fit(
      C,
      [
        [-95, -32, 0],
        [95, 2, 0],
        [-95, -32, WH + 3],
        [95, 2, WH + 3],
        [0, 0, 0],
      ],
      200,
      160
    )
    const P = proj(C)
    const front = facing(C)

    // 1. Room Floor Slabs (Elevated light hospital platforms)
    const roomFloors = ROOM_WALLS.map((rw) =>
      poly([P(rw.left, -RD, 0), P(rw.right, -RD, 0), P(rw.right, 0, 0), P(rw.left, 0, 0)])
    )

    // 2. Back Hospital Wall across all rooms (Same WH=28 height)
    const backWallPath = poly([
      P(-93, -RD, 0),
      P(93, -RD, 0),
      P(93, -RD, WH),
      P(-93, -RD, WH),
    ])

    // 3. Room Dividing Partition Walls (Exactly same WH=28 height, perfectly level!)
    const partitionPaths = [
      // Left exterior wall
      poly([P(-93, -RD, 0), P(-93, 0, 0), P(-93, 0, WH), P(-93, -RD, WH)]),
      // Divider 1 (between Room 1 & 2)
      poly([P(-31, -RD, 0), P(-31, 0, 0), P(-31, 0, WH), P(-31, -RD, WH)]),
      // Divider 2 (between Room 2 & 3)
      poly([P(31, -RD, 0), P(31, 0, 0), P(31, 0, WH), P(31, -RD, WH)]),
      // Right exterior wall
      poly([P(93, -RD, 0), P(93, 0, 0), P(93, 0, WH), P(93, -RD, WH)]),
    ]

    // 4. Overhead Entrance Header Beams (Level with partition walls at WH=28)
    const headerBeams = ROOM_WALLS.map((rw) =>
      poly([
        P(rw.left, 0, WH - 2.5),
        P(rw.right, 0, WH - 2.5),
        P(rw.right, 0, WH),
        P(rw.left, 0, WH),
      ])
    )

    // Green Station Signs mounted cleanly above the entrance at WH + 2
    const signPositions: [number, number][] = ROOM_WALLS.map((rw) =>
      P(rw.cx, 0, WH + 2)
    )

    // 5. Discrete, non-overlapping hit zones partitioned along room divider walls
    const hitZones = [
      { x: 0, y: 20, w: 138, h: 280 },
      { x: 138, y: 20, w: 106, h: 280 },
      { x: 244, y: 20, w: 156, h: 280 },
    ]

    const roomGeometries = []

    for (let i = 0; i < N; i++) {
      const rw = ROOM_WALLS[i]
      const cx = rw.cx
      const doorHingeX = rw.left // Door hinges DIRECTLY on the partition wall front corner!

      // =====================================================================
      // 1. EXECUTIVE CONSULTATION DESK & PC WORKSTATION (Every Room)
      // =====================================================================
      const objects: {
        sil: string
        crease?: string
        color?: string
        type?: string
        p1?: [number, number]
        p2?: [number, number]
      }[] = []

      // Desktop PC Computer Tower (CPU) under/beside desk
      const pcTower = prism(P, front, ...rings(cx - 20, -25, cx - 16, -17, 0.8, 0.3), 0, 8.5)

      // Desk Table Top (Spacious Consultation Surface)
      const deskTop = prism(P, front, ...rings(cx - 20, -27, cx + 2, -15, 1.8, 0.6), 8.5, 9.8)

      // Desk Modesty & Support Panels
      const deskPanel = prism(P, front, ...rings(cx - 19, -16.5, cx + 1, -15, 0.6, 0.2), 0, 8.5)
      const deskRightLeg = prism(P, front, ...rings(cx - 1, -26, cx + 1.5, -16, 0.6, 0.2), 0, 8.5)

      // PC Widescreen Monitor Base & Elevated Screen
      const monitorBase = prism(P, front, ...rings(cx - 11, -23, cx - 7, -20, 0.8, 0.3), 9.8, 11.5)
      const monitorScreen = prism(P, front, ...rings(cx - 14, -23.5, cx - 4, -21.5, 0.6, 0.2), 11.5, 19.5)

      // PC Keyboard & Mouse on Desk
      const keyboard = prism(P, front, ...rings(cx - 12, -19.5, cx - 5, -16.5, 0.5, 0.2), 9.8, 10.5)
      const mouse = prism(P, front, ...rings(cx - 3.5, -18.5, cx - 1.5, -16.5, 0.4, 0.1), 9.8, 10.4)

      // Ergonomic Examiner Swivel Office Chair
      const chairBase = {
        sil: '',
        type: 'line',
        p1: P(cx - 9, -10, 0),
        p2: P(cx - 9, -10, 5),
      }
      const chairSeat = prism(P, front, ...rings(cx - 13, -13, cx - 5, -7, 1.8, 0.6), 5, 7.5)
      const chairBack = prism(P, front, ...rings(cx - 13, -7.5, cx - 5, -6, 1.2, 0.4), 7.5, 16.5)

      objects.push(
        pcTower,
        deskPanel,
        deskRightLeg,
        deskTop,
        monitorBase,
        monitorScreen,
        keyboard,
        mouse,
        chairBase,
        chairSeat,
        chairBack
      )

      // =====================================================================
      // 2. CLINICAL SPECIALTY MEDICAL EQUIPMENT PER ROOM
      // =====================================================================
      if (i === 0) {
        // ROOM 1: Doctor Consultation + Seated Patient in Interview
        // Patient consultation chair facing doctor desk
        const patientChairSeat = prism(P, front, ...rings(cx + 10, -23, cx + 18, -15, 1.8, 0.6), 0, 7.5)
        const patientChairBack = prism(P, front, ...rings(cx + 16.5, -23, cx + 18, -15, 0.8, 0.3), 7.5, 17)

        // Seated Patient Figure
        const patientTorso = prism(P, front, ...rings(cx + 11.5, -21.5, cx + 16.5, -16.5, 1.5, 0.5), 7.5, 16)
        const patientHead = prism(P, front, ...rings(cx + 12.5, -20.5, cx + 15.5, -17.5, 1.2, 0.4), 16, 21)

        // Patient consultation speech dialogue bubble
        const speechBubble = prism(P, front, ...rings(cx + 10, -21, cx + 18, -17, 1.5, 0.4), 23, 28)
        // Medical Chart Clipboard on Desk
        const clipboard = prism(P, front, ...rings(cx, -23, cx + 2, -18, 0.4, 0.1), 9.8, 10.3)

        objects.push(
          patientChairSeat,
          patientChairBack,
          patientTorso,
          patientHead,
          speechBubble,
          clipboard
        )
      } else if (i === 1) {
        // ROOM 2: CPR Examination Table & Supine Resuscitation Mannequin
        // Clinical examination stretcher / bed
        const bedFrame = prism(P, front, ...rings(cx + 7, -28, cx + 27, -10, 2.2, 0.7), 0, 8.5)
        const bedMattress = prism(P, front, ...rings(cx + 8, -27, cx + 26, -11, 2, 0.6), 8.5, 11)
        const headrestPillow = prism(P, front, ...rings(cx + 21, -26, cx + 26, -12, 1.5, 0.4), 11, 13)

        // Supine CPR Resuscitation Mannequin
        const cprTorso = prism(P, front, ...rings(cx + 12, -23, cx + 20, -15, 1.8, 0.5), 11, 15.5)
        const cprHead = prism(P, front, ...rings(cx + 21, -22, cx + 25, -16, 1.3, 0.4), 11, 15.5)
        const cprLegs = prism(P, front, ...rings(cx + 9, -22, cx + 12, -16, 1.2, 0.4), 11, 14)

        // Mobile Cardiac Defibrillator Monitor on Pole
        const monitorPole = {
          sil: '',
          type: 'line',
          p1: P(cx + 22, -29, 0),
          p2: P(cx + 22, -29, 23),
        }
        const cardiacScreen = prism(P, front, ...rings(cx + 19, -30, cx + 25, -28, 0.8, 0.3), 17, 23)

        objects.push(
          bedFrame,
          bedMattress,
          headrestPillow,
          cprTorso,
          cprHead,
          cprLegs,
          monitorPole,
          cardiacScreen
        )
      } else {
        // ROOM 3: Mobile Emergency Crash Cart & IV Infusion Stand
        // Multi-tier emergency crash cart
        const crashCart = prism(P, front, ...rings(cx + 8, -26, cx + 20, -14, 2, 0.6), 2, 17)
        // Defibrillator monitor unit on top shelf
        const defibMonitor = prism(P, front, ...rings(cx + 10, -24, cx + 18, -16, 1.2, 0.4), 17, 23.5)

        // Tall IV infusion pole with saline bottle
        const ivPole = {
          sil: '',
          type: 'line',
          p1: P(cx + 24, -18, 0),
          p2: P(cx + 24, -18, 32),
        }
        const ivCross = {
          sil: '',
          type: 'line',
          p1: P(cx + 21.5, -18, 31),
          p2: P(cx + 26.5, -18, 31),
        }
        const ivBottle = prism(P, front, ...rings(cx + 21, -19, cx + 23, -17, 0.6, 0.2), 24, 30)

        objects.push(crashCart, defibMonitor, ivPole, ivCross, ivBottle)
      }

      roomGeometries.push({
        cx,
        doorHingeX,
        objects,
      })
    }

    return {
      P,
      roomGeometries,
      backWallPath,
      partitionPaths,
      roomFloors,
      headerBeams,
      signPositions,
      hitZones,
    }
  }, [])

  // Smooth Stable Door Swing Physics (Door height DH=28 EXACTLY matches wall height WH=28!)
  useEffect(() => {
    let animId: number
    const targetAngles = [28, 28, 28] // Default open invitation angle

    if (activeDoor >= 0) {
      for (let i = 0; i < N; i++) {
        // Active door swings wide open to 75° against partition wall; others stay ajar at 28°
        targetAngles[i] = i === activeDoor ? 75 : 28
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
      {/* Top Clinical Readout Card (Crisp Light Medical Hospital Styling) */}
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
                    Circuit ECOS • 3 Salles d&apos;Évaluation Clinique
                  </span>
                  <span className="text-slate-400 text-xs hidden sm:inline">
                    (Passez la souris sur une salle pour l&apos;activer)
                  </span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {activeStation
                ? `${activeStation.roomType} — ${activeStation.description}`
                : 'Bureaux d’évaluation médicale ouverts • Portes vitrées de même hauteur que les cloisons'}
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

      {/* Main 3D Spacious Clinic Suite SVG Stage */}
      <div
        className="relative w-full max-w-[620px] aspect-[400/320] flex items-center justify-center rounded-3xl bg-white p-2 border border-slate-200 shadow-md overflow-hidden"
        onMouseLeave={() => setActiveDoor(-1)}
      >
        <svg
          viewBox="0 0 400 320"
          preserveAspectRatio="xMidYMid meet"
          className="size-full overflow-visible"
          onMouseLeave={() => setActiveDoor(-1)}
        >
          {/* 1. BACK HOSPITAL WALL (Exact WH=28 height) */}
          <path
            d={backWallPath}
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />

          {/* 2. ROOM FLOORS (Spacious Light Medical Slabs) */}
          {roomFloors.map((flD, idx) => {
            const isHovered = idx === activeDoor
            const st = STATIONS[idx]
            return (
              <path
                key={idx}
                d={flD}
                fill={isHovered ? '#FFFFFF' : '#F8FAFC'}
                stroke={isHovered ? st.color : '#E2E8F0'}
                strokeWidth={isHovered ? '1.8' : '1'}
                className="transition-colors duration-300"
              />
            )
          })}

          {/* 3. ARCHITECTURAL PARTITION WALLS BETWEEN ROOMS (Exact WH=28 height from back to front) */}
          {partitionPaths.map((wD, idx) => (
            <path
              key={idx}
              d={wD}
              fill="#E2E8F0"
              stroke="#94A3B8"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          ))}

          {/* 4. OVERHEAD ENTRANCE HEADER BEAMS (Flush with partition walls at WH=28) */}
          {headerBeams.map((bD, idx) => {
            const isHovered = idx === activeDoor
            const st = STATIONS[idx]
            return (
              <path
                key={idx}
                d={bD}
                fill="#F1F5F9"
                stroke={isHovered ? st.color : '#94A3B8'}
                strokeWidth="1.1"
              />
            )
          })}

          {/* 5. ROOM INTERIORS (Desk + PC System + Clinical Equipment) */}
          {roomGeometries.map((rm, idx) => {
            const st = STATIONS[idx]
            const isHovered = idx === activeDoor
            const angle = doorAngles[idx]

            // Modern Clinic Door Calculation - Hinged directly at partition wall corner, height DH=WH=28
            const radTh = rad(angle)
            const cosT = Math.cos(radTh),
              sinT = Math.sin(radTh)
            const xh = rm.doorHingeX

            const p0 = [xh, 0],
              p1 = [xh + DW * cosT, -DW * sinT],
              p2 = [xh + DW * cosT + DT * sinT, -DW * sinT + DT * cosT],
              p3 = [xh + DT * sinT, DT * cosT]

            const ptsB = [p0, p1, p2, p3].map(([x, y]) => P(x, y, 0))
            const ptsT = [p0, p1, p2, p3].map(([x, y]) => P(x, y, DH))
            const doorLeafD = poly(hull(ptsT.concat(ptsB)))
            const doorCreaseD = openPoly([ptsT[0], ptsT[1], ptsT[2]])
            const handlePos = P(
              xh + (DW - 4) * cosT + DT * sinT,
              -(DW - 4) * sinT + DT * cosT,
              DH * 0.48
            )

            // Warm Specialty Floodlight on Floor when room is active
            const floorLightD = poly([
              P(rm.cx - 28, -RD + 2, 0),
              P(rm.cx + 28, -RD + 2, 0),
              P(rm.cx + 28, 0, 0),
              P(rm.cx - 28, 0, 0),
            ])

            return (
              <g key={st.id} className="pointer-events-none">
                {/* Floor Accent Glow */}
                {isHovered && (
                  <path
                    d={floorLightD}
                    fill={st.color}
                    fillOpacity="0.12"
                    className="transition-opacity duration-300"
                  />
                )}

                {/* Desk + PC System + Clinical Equipment inside room */}
                <g
                  style={{
                    opacity: isHovered ? 1 : 0.85,
                  }}
                >
                  {rm.objects.map((obj, oIdx) => (
                    <React.Fragment key={oIdx}>
                      {obj.sil && (
                        <path
                          d={obj.sil}
                          fill="#FFFFFF"
                          stroke={isHovered ? st.color : '#64748B'}
                          strokeWidth={isHovered ? '1.3' : '1.1'}
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

                {/* SOLID CLINIC GLASS DOOR LEAF (Hinged directly on partition wall, height EXACTLY matches wall height WH=28!) */}
                <path
                  d={doorLeafD}
                  fill="#FFFFFF"
                  fillOpacity="0.82"
                  stroke={isHovered ? st.color : '#475569'}
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
                {/* Sleek Vertical Door Handle */}
                <circle
                  cx={handlePos[0]}
                  cy={handlePos[1]}
                  r="1.8"
                  fill={isHovered ? st.color : '#64748B'}
                  stroke="#FFFFFF"
                  strokeWidth="0.6"
                />

                {/* GREEN HOSPITAL EXIT-STYLE SIGNBOARD (Mounted on header beam, always crisp and on top!) */}
                <g>
                  <rect
                    x={signPositions[idx][0] - 18}
                    y={signPositions[idx][1] - 6}
                    width="36"
                    height="12"
                    rx="2"
                    fill={isHovered ? '#047857' : '#065F46'}
                    stroke={isHovered ? '#34D399' : '#10B981'}
                    strokeWidth="1.2"
                    style={{
                      filter: isHovered
                        ? 'drop-shadow(0 0 8px rgba(16,185,129,0.8))'
                        : 'drop-shadow(0 0 3px rgba(16,185,129,0.35))',
                    }}
                  />
                  <circle
                    cx={signPositions[idx][0] - 12}
                    cy={signPositions[idx][1]}
                    r="1.6"
                    fill="#A7F3D0"
                  />
                  <text
                    x={signPositions[idx][0] + 2}
                    y={signPositions[idx][1] + 2.2}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="5"
                    fontWeight="800"
                    fontFamily="monospace"
                    letterSpacing="0.08em"
                    className="select-none"
                  >
                    STATION {st.stationNumber}
                  </text>
                </g>
              </g>
            )
          })}

          {/* 6. STATIC INVISIBLE HIT TARGETS (Discrete, Non-overlapping, Silky Smooth) */}
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

      {/* Interactive Station Sliders (Pure Light Medical Palette) */}
      <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-[620px]">
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
