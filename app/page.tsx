'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import { CheckCircle2, ShieldCheck, Stethoscope } from 'lucide-react'
import { OsceDoorsFigure } from '@/components/OsceDoorsFigure'

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' })
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' })

const INK = '#17135C'

export default function LandingPage() {
  const [totalScore, setTotalScore] = useState(15.1)
  const [isPassed, setIsPassed] = useState(true)

  return (
    <div
      className={`${display.variable} ${body.variable} relative min-h-dvh overflow-x-hidden font-[family-name:var(--font-body)] antialiased`}
      style={{
        color: INK,
        backgroundColor: '#FFFAFB',
        // Real ECG millimeter grid background pattern
        backgroundImage: `
          linear-gradient(rgba(229,56,136,0.18) 1px, transparent 1px),
          linear-gradient(90deg, rgba(229,56,136,0.18) 1px, transparent 1px),
          linear-gradient(rgba(229,56,136,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(229,56,136,0.06) 1px, transparent 1px)`,
        backgroundSize: '60px 60px, 60px 60px, 12px 12px, 12px 12px',
      }}
    >
      <div className="mx-auto grid min-h-dvh max-w-7xl grid-rows-[auto_1fr] px-5 sm:px-8">
        {/* Top Header - Pure branding without any portal buttons or New Era ECOS */}
        <header className="flex items-center justify-between py-6">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight hover:opacity-90 transition-opacity"
          >
            OSCE<span style={{ color: '#E53888' }}>-flow</span>
          </Link>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Centre d&apos;Évaluation Clinique</span>
          </div>
        </header>

        {/* Main Hero Grid */}
        <main className="grid items-center gap-10 pb-12 lg:grid-cols-[1fr_1.15fr] lg:gap-12 my-auto">
          {/* Left Column: Headline & Value Proposition - Clean presentation without any buttons */}
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Plateforme ECOS Faculté de Médecine
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,7.5vw,5.5rem)] font-extrabold leading-[0.94] tracking-[-0.04em]">
              Redefining Clinical Exams.
            </h1>

            <p className="text-base sm:text-lg leading-relaxed opacity-75 max-w-md">
              Fluid, objective assessment for modern medical faculties. Real-time scoring, station-by-station deliberation, and authenticated candidate audits.
            </p>

            {/* Clinical Station Overview & Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/90 border border-slate-200 shadow-xs text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Stethoscope className="size-3.5 text-blue-600" />
                  <span>Station 1</span>
                </div>
                <span className="text-[11px] text-slate-500">Anamnèse & Bureau PC</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/90 border border-slate-200 shadow-xs text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <CheckCircle2 className="size-3.5 text-pink-600" />
                  <span>Station 2</span>
                </div>
                <span className="text-[11px] text-slate-500">Examen & Mannequin CPR</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/90 border border-slate-200 shadow-xs text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="size-3.5 text-orange-600" />
                  <span>Station 3</span>
                </div>
                <span className="text-[11px] text-slate-500">Urgence & Chariot Mobile</span>
              </div>
            </div>

            {/* Deliberation Status Information */}
            <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Statut de Délibération ECOS</span>
                <span className={isPassed ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {isPassed ? 'Admis (≥ 10.00 / 20)' : 'Ajourné (< 10.00 / 20)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Pondération totale : 35% + 35% + 30%</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {totalScore.toFixed(1)} / 20
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D OSCE Doors Corridor Figure with Dividing Walls & Green Station Signage */}
          <div className="w-full flex flex-col items-center justify-center">
            <OsceDoorsFigure
              className="w-full"
              onScoreChange={(total, passed) => {
                setTotalScore(total)
                setIsPassed(passed)
              }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

