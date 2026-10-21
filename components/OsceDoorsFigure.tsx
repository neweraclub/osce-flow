'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'

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
  description: string
  awardedPoints: number
}

const STATIONS: StationInfo[] = [
  {
    id: 'anamnese',
    name: 'Anamnèse',
    stationNumber: 1,
    weight: 35,
    color: '#3B33FF', // Clinical Royal Blue
    defaultScore: 16,
    description: 'Entretien patient & recueil clinique',
    awardedPoints: 5.6,
  },
  {
    id: 'examen',
    name: 'Examen physique',
    stationNumber: 2,
    weight: 35,
    color: '#E53888', // Medical Magenta Pulse
    defaultScore: 15,
    description: 'Auscultation & examen clinique sur table',
    awardedPoints: 5.3,
  },
  {
    id: 'urgence',
    name: 'Urgence',
    stationNumber: 3,
    weight: 30,
    color: '#F97316', // Emergency Amber Orange
    defaultScore: 14,
    description: 'Réanimation d’urgence, chariot & monitorage',
    awardedPoints: 4.2,
  },
]

const N = 3
const INK = '#17135C'
const PASS_SCORE = 10.0 // /20

// Room Centers & Proportions
const POS_X = [-52, 0, 52]
const RW = 46 // Room width
const RD = 26 // Room depth (y from -26 to 0)
const WH = 26 // Wall height
const DH = 24 // Door height
const DW = 20 // Door leaf width
const DT = 1.2 // Door thickness

const ROOM_BOUNDS = [
  { left: -76, right: -28, cx: -52 },
  { left: -26, right: 26, cx: 0 },
  { left: 28, right: 76, cx: 52 },
]

// Isometric Projection Engine
const rad = (d: number) => (d * Math.PI) / 180
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
  const [doorAngles, setDoorAngles] = useState<number[]>([0, 0, 0])

  // Real-time Running Total with Pass Line at 10/20
  // When a door opens, its station points are fully awarded!
  const currentTotal = useMemo(() => {
    if (activeDoor === 0) return 8.0 + 5.6 // Anamnèse awards +5.6 => 13.6/20 (Passed)
    if (activeDoor === 1) return 8.0 + 5.3 // Examen awards +5.3 => 13.3/20 (Passed)
    if (activeDoor === 2) return 8.0 + 4.2 // Urgence awards +4.2 => 12.2/20 (Passed)
    return 8.0 // Closed rest state (before station points awarded)
  }, [activeDoor])

  const isPassed = currentTotal >= PASS_SCORE

  useEffect(() => {
    onScoreChange?.(currentTotal, isPassed)
  }, [currentTotal, isPassed, onScoreChange])

  // Camera & Geometry Fit
  const {
    P,
    roomGeometries,
    roomFloorPaths,
    roomShadowPaths,
    backWallPaths,
    partitionWallPaths,
    doorwayFrames,
    hitZones,
  } = useMemo(() => {
    // Scaled up S=2.45 to fill the canvas, centered
    const C = Cam(35, 0.5, 2.45)
    fit(
      C,
      [
        [-80, -28, 0],
        [80, 4, 0],
        [-80, -28, WH + 3],
        [80, 4, WH + 3],
        [0, 0, 0],
      ],
      210,
      148
    )
    const P = proj(C)
    const front = facing(C)

    // 1. Room Floor Platforms & Soft Shadows
    const roomFloorPaths: string[] = []
    const roomShadowPaths: string[] = []

    ROOM_BOUNDS.forEach((rb) => {
      const p0 = P(rb.left, -RD, 0)
      const p1 = P(rb.right, -RD, 0)
      const p2 = P(rb.right, 0, 0)
      const p3 = P(rb.left, 0, 0)
      roomFloorPaths.push(poly([p0, p1, p2, p3]))

      // Ambient drop shadow quad under room
      const s0 = P(rb.left - 1.5, -RD - 1.5, -0.5)
      const s1 = P(rb.right + 2, -RD - 1.5, -0.5)
      const s2 = P(rb.right + 2, 2.5, -0.5)
      const s3 = P(rb.left - 1.5, 2.5, -0.5)
      roomShadowPaths.push(poly([s0, s1, s2, s3]))
    })

    // 2. Back Wall per Room
    const backWallPaths = ROOM_BOUNDS.map((rb) =>
      poly([P(rb.left, -RD, 0), P(rb.right, -RD, 0), P(rb.right, -RD, WH), P(rb.left, -RD, WH)])
    )

    // 3. Partition Walls (Dividing rooms with architectural cutaway)
    const partitionWallPaths = [
      // Left exterior
      poly([P(-76, -RD, 0), P(-76, 0, 0), P(-76, 0, WH), P(-76, -RD, WH)]),
      // Divider 1 (between Anamnèse & Examen)
      poly([P(-27, -RD, 0), P(-27, 0, 0), P(-27, 0, WH), P(-27, -RD, WH)]),
      // Divider 2 (between Examen & Urgence)
      poly([P(27, -RD, 0), P(27, 0, 0), P(27, 0, WH), P(27, -RD, WH)]),
      // Right exterior
      poly([P(76, -RD, 0), P(76, 0, 0), P(76, 0, WH), P(76, -RD, WH)]),
    ]

    // 4. Doorway Frames
    const doorwayFrames: string[] = []

    POS_X.forEach((cx, idx) => {
      const x0 = cx - DW / 2
      const x1 = cx + DW / 2
      doorwayFrames.push(
        openPoly([
          P(x0, 0, 0),
          P(x0, 0, DH),
          P(x1, 0, DH),
          P(x1, 0, 0),
        ])
      )
    })

    // 5. Discrete Screen Hit Zones (Non-overlapping)
    const hitZones = [
      { x: 0, y: 20, w: 142, h: 260 },
      { x: 142, y: 20, w: 110, h: 260 },
      { x: 252, y: 20, w: 168, h: 260 },
    ]

    const roomGeometries = []

    for (let i = 0; i < N; i++) {
      const cx = POS_X[i]
      const doorHingeX = cx - DW / 2

      const objects: {
        sil: string
        crease?: string
        type?: string
        p1?: [number, number]
        p2?: [number, number]
        points?: [number, number][]
      }[] = []

      // =======================================================================
      // 1. EXAMINER OFFICE DESK & DESKTOP PC WORKSTATION (In Every Room)
      // =======================================================================
      // PC Computer Tower (CPU) under/beside desk
      const pcTower = prism(P, front, ...rings(cx - 21, -24, cx - 18, -17, 0.8, 0.3), 0, 7.5)

      // Desk Table Top (Consultation & Evaluation Surface)
      const deskTop = prism(P, front, ...rings(cx - 21.5, -25, cx - 5.5, -15, 1.4, 0.4), 7.5, 8.8)

      // Desk Modesty & Support Panels
      const deskPanel = prism(P, front, ...rings(cx - 21, -16.2, cx - 6, -15, 0.5, 0.2), 0, 7.5)
      const deskRightLeg = prism(P, front, ...rings(cx - 7.5, -24, cx - 6, -16, 0.5, 0.2), 0, 7.5)

      // Desktop PC Widescreen Monitor Base & Elevated Screen
      const monitorBase = prism(P, front, ...rings(cx - 15, -22, cx - 11, -19.5, 0.6, 0.2), 8.8, 10.2)
      const monitorScreen = prism(P, front, ...rings(cx - 17, -22.5, cx - 9, -21, 0.6, 0.2), 10.2, 17.5)

      // PC Keyboard & Mouse on Desk
      const keyboard = prism(P, front, ...rings(cx - 15.5, -19, cx - 10.5, -16.5, 0.4, 0.1), 8.8, 9.4)
      const mouse = prism(P, front, ...rings(cx - 9, -18.5, cx - 7.5, -16.8, 0.3, 0.1), 8.8, 9.3)

      // Examiner Ergonomic Office Swivel Chair
      const chairBase = {
        sil: '',
        type: 'line',
        p1: P(cx - 13, -11, 0),
        p2: P(cx - 13, -11, 4.5),
      }
      const chairSeat = prism(P, front, ...rings(cx - 16, -13.5, cx - 10, -8.5, 1.2, 0.4), 4.5, 6.8)
      const chairBack = prism(P, front, ...rings(cx - 16, -9, cx - 10, -7.5, 0.8, 0.3), 6.8, 14.5)

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

      // =======================================================================
      // 2. DISTINCT CLINICAL EXAMINATION SPECIALTY PER ROOM
      // =======================================================================
      if (i === 0) {
        // =====================================================================
        // ROOM 1: ANAMNÈSE (Patient Interview Chair + Seated Patient + Notepad)
        // =====================================================================
        // Patient consultation chair facing the doctor's desk
        const patChairSeat = prism(P, front, ...rings(cx + 6, -21, cx + 13, -14, 1.4, 0.4), 0, 6.5)
        const patChairBack = prism(P, front, ...rings(cx + 11.5, -21, cx + 13, -14, 0.8, 0.3), 6.5, 14.5)

        // Seated Patient Figure in Interview
        const patTorso = prism(P, front, ...rings(cx + 7, -19.5, cx + 11.5, -15.5, 1.2, 0.4), 6.5, 13.5)
        const patHead = prism(P, front, ...rings(cx + 8, -18.5, cx + 10.5, -16.5, 1, 0.3), 13.5, 17.5)

        // Clinical Evaluation Notepad on Desk with Paper Lines
        const notepad = prism(P, front, ...rings(cx - 4.5, -21, cx - 1.5, -17, 0.4, 0.1), 8.8, 9.2)
        const noteLine1 = {
          sil: '',
          type: 'line',
          p1: P(cx - 4, -20, 9.2),
          p2: P(cx - 2, -20, 9.2),
        }
        const noteLine2 = {
          sil: '',
          type: 'line',
          p1: P(cx - 4, -18.5, 9.2),
          p2: P(cx - 2.5, -18.5, 9.2),
        }

        objects.push(
          patChairSeat,
          patChairBack,
          patTorso,
          patHead,
          notepad,
          noteLine1,
          noteLine2
        )
      } else if (i === 1) {
        // =====================================================================
        // ROOM 2: EXAMEN PHYSIQUE (Clinical Couch + Supine Patient + Stethoscope)
        // =====================================================================
        // Examination Couch / Table (Table d'examen clinique)
        const couchBase = prism(P, front, ...rings(cx + 1.5, -23, cx + 18, -11, 1.6, 0.5), 0, 7.5)
        const couchMattress = prism(P, front, ...rings(cx + 2, -22.5, cx + 17.5, -11.5, 1.4, 0.4), 7.5, 9.5)
        const headrest = prism(P, front, ...rings(cx + 12.5, -22, cx + 17.5, -12, 1.2, 0.3), 9.5, 11.5)

        // Supine Patient Shape on Couch
        const patTorso = prism(P, front, ...rings(cx + 6.5, -19, cx + 12.5, -15, 1.2, 0.3), 9.5, 13)
        const patHead = prism(P, front, ...rings(cx + 13.5, -18.5, cx + 16.5, -15.5, 1, 0.3), 11.5, 14.5)
        const patLegs = prism(P, front, ...rings(cx + 3, -18.5, cx + 6.5, -15.5, 1, 0.3), 9.5, 11.8)

        // Stethoscope on wall hook beside exam table
        const stethStand = {
          sil: '',
          type: 'line',
          p1: P(cx + 19.5, -22, 0),
          p2: P(cx + 19.5, -22, 20),
        }
        const stethHook = {
          sil: '',
          type: 'line',
          p1: P(cx + 18, -22, 19.5),
          p2: P(cx + 21, -22, 19.5),
        }
        const stethTube1 = {
          sil: '',
          type: 'line',
          p1: P(cx + 19.5, -22, 19.5),
          p2: P(cx + 18.5, -21, 14),
        }
        const stethTube2 = {
          sil: '',
          type: 'line',
          p1: P(cx + 18.5, -21, 14),
          p2: P(cx + 17.5, -20, 11),
        }

        objects.push(
          couchBase,
          couchMattress,
          headrest,
          patTorso,
          patHead,
          patLegs,
          stethStand,
          stethHook,
          stethTube1,
          stethTube2
        )
      } else {
        // =====================================================================
        // ROOM 3: URGENCE (Emergency Crash Cart + Monitor ECG + IV Pole)
        // =====================================================================
        // Multi-tier Emergency Crash Cart
        const crashCart = prism(P, front, ...rings(cx + 1.5, -23, cx + 12.5, -12, 1.6, 0.5), 1.5, 14)
        const drawerLine1 = {
          sil: '',
          type: 'line',
          p1: P(cx + 1.5, -12, 6),
          p2: P(cx + 12.5, -12, 6),
        }
        const drawerLine2 = {
          sil: '',
          type: 'line',
          p1: P(cx + 1.5, -12, 10),
          p2: P(cx + 12.5, -12, 10),
        }

        // Vital Signs Defibrillator Monitor on Crash Cart
        const monitorBody = prism(P, front, ...rings(cx + 3.5, -21, cx + 10.5, -14, 1, 0.3), 14, 20.5)

        // Heartbeat ECG Pulse Wave on Monitor Screen (P-Q-R-S-T)
        const ecgPoints: [number, number][] = [
          P(cx + 4.5, -14, 17.2),
          P(cx + 6, -14, 17.2),
          P(cx + 6.8, -14, 19.2),
          P(cx + 7.5, -14, 15.5),
          P(cx + 8.2, -14, 18),
          P(cx + 9.5, -14, 17.2),
        ]
        const ecgWave = {
          sil: '',
          type: 'wave',
          points: ecgPoints,
        }

        // Tall IV Infusion Stand (Tige à perfusion)
        const ivPole = {
          sil: '',
          type: 'line',
          p1: P(cx + 16.5, -17, 0),
          p2: P(cx + 16.5, -17, 29),
        }
        const ivHanger = {
          sil: '',
          type: 'line',
          p1: P(cx + 14.5, -17, 28),
          p2: P(cx + 18.5, -17, 28),
        }
        const salineBag = prism(P, front, ...rings(cx + 14.5, -18, cx + 16.2, -16, 0.4, 0.2), 22, 27.5)

        objects.push(
          crashCart,
          drawerLine1,
          drawerLine2,
          monitorBody,
          ecgWave,
          ivPole,
          ivHanger,
          salineBag
        )
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
      roomFloorPaths,
      roomShadowPaths,
      backWallPaths,
      partitionWallPaths,
      doorwayFrames,
      hitZones,
    }
  }, [])

  // Smooth Stable Door Swing Physics:
  // Active door swings wide open (78°); neighbors crack slightly (22° and 6°)
  useEffect(() => {
    let animId: number
    const targetAngles = [0, 0, 0] // Closed rest state

    if (activeDoor >= 0) {
      for (let i = 0; i < N; i++) {
        const dist = Math.abs(i - activeDoor)
        targetAngles[i] = dist === 0 ? 78 : dist === 1 ? 22 : 6
      }
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setDoorAngles(targetAngles)
      return
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
      className={`relative flex flex-col items-center select-none bg-transparent ${className}`}
      onMouseLeave={() => setActiveDoor(-1)}
    >
      {/* 1. DYNAMIC REAL-TIME DELIBERATION READ-OUT (Pass Line at 10/20) */}
      <div className="mb-3 w-full flex items-center justify-between px-4 sm:px-6 py-3 rounded-2xl bg-white/95 border border-[#17135C]/15 shadow-sm">
        {/* Active Station Readout */}
        <div className="flex items-center gap-3">
          <span
            className="size-3 rounded-full transition-all duration-300"
            style={{
              backgroundColor: activeStation ? activeStation.color : INK,
              boxShadow: activeStation
                ? `0 0 12px ${activeStation.color}`
                : 'none',
            }}
          />
          <div>
            <div className="text-xs sm:text-sm font-bold flex items-center gap-2" style={{ color: INK }}>
              {activeStation ? (
                <>
                  <span
                    className="font-mono text-xs px-2.5 py-0.5 rounded-full font-extrabold text-white"
                    style={{ backgroundColor: activeStation.color }}
                  >
                    {activeStation.name}
                  </span>
                  <span>{activeStation.weight}%</span>
                  <span className="font-semibold text-xs opacity-75">
                    +{activeStation.awardedPoints} pts
                  </span>
                </>
              ) : (
                <>
                  <span className="font-extrabold">Circuit ECOS Clinique</span>
                  <span className="text-xs font-normal opacity-60 hidden sm:inline">
                    (Survolez ou touchez une porte pour ouvrir la station)
                  </span>
                </>
              )}
            </div>
            <div className="text-[11px] opacity-70" style={{ color: INK }}>
              {activeStation
                ? activeStation.description
                : '3 Stations d’Évaluation • Seuil de Délibération fixé à 10.00 / 20'}
            </div>
          </div>
        </div>

        {/* Dynamic Running Total Score with Pass Line Gauge */}
        <div className="text-right flex flex-col items-end">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight" style={{ color: INK }}>
              {currentTotal.toFixed(1)}
            </span>
            <span className="text-xs font-semibold opacity-50" style={{ color: INK }}>/ 20</span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (currentTotal / 20) * 100)}%`,
                  backgroundColor: isPassed ? '#10B981' : '#E11D48',
                }}
              />
              {/* Pass Line Marker at 50% (10/20) */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/40 z-10" />
            </div>
            <span
              className={`text-[10px] font-bold tracking-wider uppercase ${
                isPassed ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {isPassed ? 'Admis (≥ 10/20)' : 'Seuil 10/20'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN 3D ISOMETRIC STATIONS CANVAS (Pure Transparent Background) */}
      <div
        className="relative w-full max-w-[640px] aspect-[420/280] flex items-center justify-center bg-transparent overflow-visible"
        onMouseLeave={() => setActiveDoor(-1)}
      >
        <svg
          viewBox="0 0 420 280"
          preserveAspectRatio="xMidYMid meet"
          className="size-full overflow-visible cursor-pointer"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const relX = (e.clientX - rect.left) / rect.width
            const target = relX < 0.35 ? 0 : relX < 0.65 ? 1 : 2
            setActiveDoor(target)
          }}
          onTouchMove={(e) => {
            if (!e.touches[0]) return
            const rect = e.currentTarget.getBoundingClientRect()
            const relX = (e.touches[0].clientX - rect.left) / rect.width
            const target = relX < 0.35 ? 0 : relX < 0.65 ? 1 : 2
            setActiveDoor(target)
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const relX = (e.clientX - rect.left) / rect.width
            const target = relX < 0.35 ? 0 : relX < 0.65 ? 1 : 2
            setActiveDoor((prev) => (prev === target ? -1 : target))
          }}
          onMouseLeave={() => setActiveDoor(-1)}
        >
          {/* DEFINITIONS FOR LIGHT SPILL & SHADOWS */}
          <defs>
            <radialGradient id="roomShadowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#17135C" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#17135C" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. SOFT AMBIENT ROOM SHADOWS */}
          {roomShadowPaths.map((sdD, idx) => (
            <path key={idx} d={sdD} fill="url(#roomShadowGrad)" />
          ))}

          {/* 2. SOLID ROOM FLOOR PLATFORMS (Pure White with crisp Ink Border) */}
          {roomFloorPaths.map((flD, idx) => {
            const isHovered = idx === activeDoor
            const st = STATIONS[idx]
            return (
              <path
                key={idx}
                d={flD}
                fill="#FFFFFF"
                stroke={isHovered ? st.color : INK}
                strokeWidth={isHovered ? '2' : '1.3'}
                strokeOpacity={isHovered ? 1 : 0.8}
                className="transition-colors duration-300"
              />
            )
          })}

          {/* 3. BACK HOSPITAL WALLS */}
          {backWallPaths.map((bwD, idx) => (
            <path
              key={idx}
              d={bwD}
              fill="#FFFFFF"
              stroke={INK}
              strokeWidth="1.2"
              strokeOpacity="0.4"
            />
          ))}

          {/* 4. ARCHITECTURAL PARTITION WALLS (Clear Object Contrast) */}
          {partitionWallPaths.map((pwD, idx) => (
            <path
              key={idx}
              d={pwD}
              fill="#FFFFFF"
              stroke={INK}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          ))}

          {/* 5. INTERIOR ROOM PROPS (Distinct Setup per Station) */}
          {roomGeometries.map((rm, idx) => {
            const st = STATIONS[idx]
            const isHovered = idx === activeDoor
            const angle = doorAngles[idx]

            // Door Leaf Calculation
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
              xh + (DW - 3) * cosT + DT * sinT,
              -(DW - 3) * sinT + DT * cosT,
              DH * 0.48
            )

            // Warm Light Spill on Floor (Spreads across floor when door swings open)
            const lightSpillD = poly([
              P(rm.doorHingeX, 0, 0),
              P(rm.doorHingeX + DW, 0, 0),
              P(rm.doorHingeX + DW + 18 * (angle / 78), 22 * (angle / 78), 0),
              P(rm.doorHingeX - 18 * (angle / 78), 22 * (angle / 78), 0),
            ])

            return (
              <g key={st.id} className="pointer-events-none">
                {/* Brand Color Floor Light Spill */}
                {angle > 4 && (
                  <path
                    d={lightSpillD}
                    fill={st.color}
                    fillOpacity={(angle / 78) * 0.25}
                    className="transition-opacity duration-200"
                  />
                )}

                {/* Props inside each room (White fill with crisp Ink outline) */}
                <g style={{ opacity: isHovered ? 1 : 0.9 }}>
                  {rm.objects.map((obj, oIdx) => (
                    <React.Fragment key={oIdx}>
                      {obj.sil && (
                        <path
                          d={obj.sil}
                          fill="#FFFFFF"
                          stroke={INK}
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                      )}
                      {obj.crease && (
                        <path
                          d={obj.crease}
                          fill="none"
                          stroke={INK}
                          strokeWidth="0.8"
                          strokeOpacity="0.45"
                        />
                      )}
                      {obj.type === 'line' && obj.p1 && obj.p2 && (
                        <line
                          x1={obj.p1[0]}
                          y1={obj.p1[1]}
                          x2={obj.p2[0]}
                          y2={obj.p2[1]}
                          stroke={INK}
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      )}
                      {obj.type === 'wave' && obj.points && (
                        <path
                          d={openPoly(obj.points)}
                          fill="none"
                          stroke={isHovered ? st.color : INK}
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      )}
                    </React.Fragment>
                  ))}
                </g>

                {/* Doorway Frame (Accented with station brand color when active) */}
                <path
                  d={doorwayFrames[idx]}
                  fill="none"
                  stroke={isHovered ? st.color : INK}
                  strokeWidth={isHovered ? '2' : '1.3'}
                  strokeOpacity={isHovered ? 1 : 0.6}
                  strokeLinecap="round"
                  className="transition-colors duration-200"
                />

                {/* Hinges on Door Frame */}
                <circle
                  cx={P(xh, 0, 4)[0]}
                  cy={P(xh, 0, 4)[1]}
                  r="1.4"
                  fill={isHovered ? st.color : INK}
                />
                <circle
                  cx={P(xh, 0, DH - 4)[0]}
                  cy={P(xh, 0, DH - 4)[1]}
                  r="1.4"
                  fill={isHovered ? st.color : INK}
                />

                {/* SOLID SWINGING DOOR LEAF */}
                <path
                  d={doorLeafD}
                  fill="#FFFFFF"
                  stroke={isHovered ? st.color : INK}
                  strokeWidth={isHovered ? '1.8' : '1.3'}
                  strokeLinejoin="round"
                  className="transition-colors duration-200"
                />
                {doorCreaseD && (
                  <path
                    d={doorCreaseD}
                    fill="none"
                    stroke={INK}
                    strokeWidth="0.8"
                    strokeOpacity="0.35"
                  />
                )}

                {/* Door Handle */}
                <circle
                  cx={handlePos[0]}
                  cy={handlePos[1]}
                  r="1.8"
                  fill={isHovered ? st.color : INK}
                  stroke="#FFFFFF"
                  strokeWidth="0.7"
                />
              </g>
            )
          })}

          {/* 6. STATIC HIT TARGETS (Discrete, Non-overlapping, Silky Smooth) */}
          {hitZones.map((zone, idx) => (
            <rect
              key={idx}
              x={zone.x}
              y={zone.y}
              width={zone.w}
              height={zone.h}
              fill="#FFFFFF"
              fillOpacity="0.001"
              pointerEvents="all"
              className="cursor-pointer"
              onMouseEnter={() => setActiveDoor(idx)}
              onTouchStart={() => setActiveDoor(idx)}
              onClick={(e) => {
                e.stopPropagation()
                setActiveDoor((prev) => (prev === idx ? -1 : idx))
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
