'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import { ArrowRight, CheckCircle2, ShieldCheck, Stethoscope } from 'lucide-react'
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
        {/* Top Header */}
        <header className="flex items-center justify-between py-6">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight hover:opacity-90 transition-opacity"
          >
            OSCE<span style={{ color: '#E53888' }}>-flow</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium opacity-60 hidden sm:inline">New Era ECOS</span>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold px-4 py-2 rounded-full border transition-all duration-200 hover:bg-[#17135C] hover:text-white flex items-center gap-1.5 shadow-sm"
              style={{ borderColor: `${INK}33` }}
            >
              Accès Portail <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </header>

        {/* Main Hero Grid */}
        <main className="grid items-center gap-10 pb-12 lg:grid-cols-[1fr_1.15fr] lg:gap-12 my-auto">
          {/* Left Column: Headline & Value Proposition */}
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
              Plateforme ECOS Faculté de Médecine
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,7.5vw,5.5rem)] font-extrabold leading-[0.94] tracking-[-0.04em]">
              Redefining Clinical Exams.
            </h1>

            <p className="text-base sm:text-lg leading-relaxed opacity-75 max-w-md">
              Fluid, objective assessment for modern medical faculties. Real-time scoring, station-by-station deliberation, and authenticated candidate audits.
            </p>

            {/* Quick Clinical Badges */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 shadow-xs text-xs font-medium">
                <Stethoscope className="size-3.5 text-blue-600" />
                <span>3 Stations d&apos;Évaluation</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 shadow-xs text-xs font-medium">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span>Seuil Fixé à 10.00 / 20</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200 shadow-xs text-xs font-medium">
                <ShieldCheck className="size-3.5 text-purple-600" />
                <span>Délibération Certifiée</span>
              </div>
            </div>

            {/* Portal Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/login"
                className="px-6 py-3 rounded-full font-bold text-sm text-white shadow-lg transition-transform hover:scale-[1.02] flex items-center gap-2"
                style={{ backgroundColor: INK }}
              >
                Espace Évaluateur & Délibération <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/student/results"
                className="px-5 py-3 rounded-full font-semibold text-sm border bg-white/70 hover:bg-white transition-all shadow-xs"
                style={{ borderColor: `${INK}26`, color: INK }}
              >
                Résultats Étudiants
              </Link>
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
