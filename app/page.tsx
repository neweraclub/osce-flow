'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import { Brain, Droplets, Heart, Wind, type LucideIcon } from 'lucide-react'

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' })
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' })

const INK = '#17135C'
const PASS = 10 // /20

type Station = { id: string; name: string; icon: LucideIcon; color: string; weight: number }

// Weights follow lib/gradeUtils: station% x weight, summed, x 0.2 => /20
const STATIONS: Station[] = [
  { id: 'cardio', name: 'Cardiologie', icon: Heart, color: '#3B33FF', weight: 30 },
  { id: 'neuro', name: 'Neurologie', icon: Brain, color: '#8B3EE1', weight: 25 },
  { id: 'pneumo', name: 'Pneumologie', icon: Wind, color: '#E53888', weight: 25 },
  { id: 'nephro', name: 'Néphrologie', icon: Droplets, color: '#F97316', weight: 20 },
]

// One heartbeat cycle is 400 units wide; the R spike grows with the score.
function tracePath(score: number) {
  const A = 4 + score * 1.7
  const cycle = (ox: number): [number, number][] => [
    [ox, 40], [ox + 90, 40], [ox + 106, 34], [ox + 122, 40], [ox + 160, 40],
    [ox + 168, 46], [ox + 180, 40 - A], [ox + 192, 50], [ox + 200, 40],
    [ox + 250, 40], [ox + 275, 31], [ox + 300, 40], [ox + 400, 40],
  ]
  const pts = [...cycle(0), ...cycle(400)]
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
}

function useTween(target: number) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    let id = 0
    const tick = () => {
      cur.current += (target - cur.current) * 0.14
      if (Math.abs(target - cur.current) < 0.004) cur.current = target
      setV(cur.current)
      if (cur.current !== target) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [target])
  return v
}

export default function LandingPage() {
  const [scores, setScores] = useState([15, 17, 14, 17])

  const total =
    STATIONS.reduce((sum, s, i) => sum + (scores[i] / 20) * 100 * (s.weight / 100), 0) * 0.2
  const shownTotal = useTween(total)
  const passed = total >= PASS

  const setScore = (i: number, value: number) =>
    setScores((prev) => prev.map((v, j) => (j === i ? Math.max(0, Math.min(20, value)) : v)))

  const fromPointer = (i: number, e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setScore(i, Math.round(((e.clientX - r.left) / r.width) * 20))
  }

  return (
    <div
      className={`${display.variable} ${body.variable} relative min-h-dvh overflow-x-hidden font-[family-name:var(--font-body)] antialiased`}
      style={{
        color: INK,
        backgroundColor: '#FFFAFB',
        // Real ECG paper: 1 mm squares and 5 mm major lines
        backgroundImage: `
          linear-gradient(rgba(229,56,136,0.20) 1px, transparent 1px),
          linear-gradient(90deg, rgba(229,56,136,0.20) 1px, transparent 1px),
          linear-gradient(rgba(229,56,136,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(229,56,136,0.08) 1px, transparent 1px)`,
        backgroundSize: '60px 60px, 60px 60px, 12px 12px, 12px 12px',
      }}
    >
      <style>{`
        @keyframes ecg-scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes ecg-reveal { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
        .ecg-scroll { animation: ecg-scroll 9s linear infinite }
        .ecg-reveal { animation: ecg-reveal 1.5s cubic-bezier(.2,.7,.2,1) both }
        @media (prefers-reduced-motion: reduce) { .ecg-scroll, .ecg-reveal { animation: none } }
      `}</style>

      <div className="mx-auto grid min-h-dvh max-w-7xl grid-rows-[auto_1fr] px-5 sm:px-8">
        
        <main className="grid items-center gap-10 pb-12 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          {/* Headline */}
          <div className="max-w-xl">
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(3rem,8.5vw,6.75rem)] font-extrabold leading-[0.92] tracking-[-0.045em]">
              Redefining Clinical Exams.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed opacity-70">
              Fluid, objective assessment for modern medical faculties.
            </p>
          </div>

          {/* The memorable thing: a marksheet that is also a heart monitor */}
          <section
            aria-label="Interactive OSCE marksheet"
            className="rounded-[28px] border bg-white/90 shadow-[0_30px_80px_-30px_rgba(59,51,255,0.45)] backdrop-blur-sm"
            style={{ borderColor: `${INK}1F` }}
          >
            <ul>
              {STATIONS.map((s, i) => {
                const Icon = s.icon
                const score = scores[i]
                return (
                  <li
                    key={s.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b px-5 pb-3 pt-4 last:border-b-0 sm:px-7"
                    style={{ borderColor: `${INK}14` }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-[18px]" style={{ color: s.color }} aria-hidden="true" />
                      <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                        {s.name}
                      </span>
                      <span className="text-xs font-medium opacity-50">weight {s.weight}%</span>
                    </div>
                    <span className="text-right text-lg font-bold tabular-nums">
                      {score}
                      <span className="text-sm font-medium opacity-50">/20</span>
                    </span>

                    {/* Lead: drag or use arrow keys to set this station's score */}
                    <div
                      role="slider"
                      tabIndex={0}
                      aria-label={`${s.name} score`}
                      aria-valuemin={0}
                      aria-valuemax={20}
                      aria-valuenow={score}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId)
                        fromPointer(i, e)
                      }}
                      onPointerMove={(e) => {
                        if (e.pointerType === 'mouse' || e.buttons === 1) fromPointer(i, e)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setScore(i, score + 1)
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setScore(i, score - 1)
                      }}
                      className="relative col-span-2 h-20 cursor-ew-resize overflow-hidden rounded-xl outline-none focus-visible:ring-2 [touch-action:pan-y]"
                      style={{ ['--tw-ring-color' as string]: s.color }}
                    >
                      {/* scored span */}
                      <div
                        className="absolute inset-y-0 left-0 transition-[width] duration-150"
                        style={{ width: `${(score / 20) * 100}%`, background: `${s.color}14` }}
                      />
                      {/* scrolling trace, drawn in once on load */}
                      <div className="ecg-reveal absolute inset-0" style={{ animationDelay: `${i * 140}ms` }}>
                        <div className="ecg-scroll flex h-full w-[200%]">
                          {[0, 1].map((k) => (
                            <svg
                              key={k}
                              viewBox="0 0 800 80"
                              preserveAspectRatio="none"
                              className="h-full w-1/2"
                              aria-hidden="true"
                            >
                              <path
                                d={tracePath(score)}
                                fill="none"
                                stroke={s.color}
                                strokeWidth="2.25"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                          ))}
                        </div>
                      </div>
                      {/* score marker */}
                      <div
                        className="absolute inset-y-0 w-px transition-[left] duration-150"
                        style={{ left: `${(score / 20) * 100}%`, background: s.color }}
                      >
                        <span
                          className="absolute -left-[4px] top-1/2 size-[9px] -translate-y-1/2 rounded-full ring-2 ring-white"
                          style={{ background: s.color }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Deliberation */}
            <div className="border-t px-5 py-5 sm:px-7" style={{ borderColor: `${INK}1F` }}>
              <div className="flex items-end justify-between gap-4">
                <div className="font-[family-name:var(--font-display)] font-extrabold leading-none tracking-[-0.04em]">
                  <span className="text-6xl tabular-nums sm:text-7xl">{shownTotal.toFixed(1)}</span>
                  <span className="ml-1 text-2xl opacity-40">/20</span>
                </div>
                <p
                  className="pb-1 text-right text-lg font-bold"
                  style={{ color: passed ? '#0E8F60' : '#D92D20' }}
                  aria-live="polite"
                >
                  {passed ? 'Admis' : 'Ajourné'}
                  <span className="block text-xs font-medium opacity-60" style={{ color: INK }}>
                    pass line at 10/20
                  </span>
                </p>
              </div>

              <div className="relative mt-4 h-2 rounded-full" style={{ background: `${INK}12` }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(shownTotal / 20) * 100}%`,
                    background: 'linear-gradient(90deg,#3B33FF,#8B3EE1,#E53888,#F97316)',
                  }}
                />
                <span
                  className="absolute -top-1.5 left-1/2 h-5 w-0.5 rounded"
                  style={{ background: INK }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
