'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  ChevronLeft,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function EvaluatorPinPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validatedStation, setValidatedStation] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (pin.trim().length < 4 || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/evaluator/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid station access PIN. Please check with the chief examiner.')
        setLoading(false)
        return
      }

      setValidatedStation(data.station)

      // Store in storage for persistence across reloads
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('evaluator_station', JSON.stringify(data.station))
        sessionStorage.setItem('evaluator_exams', JSON.stringify(data.exams || []))
        sessionStorage.setItem('evaluator_pin', pin.trim())
        localStorage.setItem('last_evaluator_station_id', data.station.id)
        document.cookie = `evaluator_station_id=${data.station.id}; path=/; max-age=86400; SameSite=Lax`
      }

      // Smooth transition to dashboard
      setTimeout(() => {
        router.push(`/evaluator/dashboard?station_id=${data.station.id}`)
      }, 600)
    } catch (err: any) {
      setError(err?.message || 'Network error while validating station PIN.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Utility Header */}
      <header className="h-16 px-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between backdrop-blur-md bg-white/70 dark:bg-slate-900/70">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="size-4" />
          <span>Exit to Portal Home</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200/60 dark:border-amber-800/60">
            <ShieldCheck className="size-3.5 text-amber-500" />
            Examiner Secure Enclave
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden relative">
            {/* Ambient Top Glow */}
            <div className="absolute -top-24 -left-24 size-48 rounded-full bg-amber-500/15 dark:bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -top-24 -right-24 size-48 rounded-full bg-blue-500/15 dark:bg-blue-500/10 blur-3xl pointer-events-none" />

            {/* Visual Asset Header with /examiner.gif */}
            <div className="flex flex-col items-center text-center">
              <div className="relative size-24 sm:size-28 rounded-2xl overflow-hidden shadow-lg border-2 border-amber-500/30 dark:border-amber-400/20 bg-slate-100 dark:bg-slate-800 p-1 group">
                <Image
                  src="/examiner.gif"
                  alt="Medical OSCE Examiner Terminal"
                  width={112}
                  height={112}
                  priority
                  unoptimized
                  className="size-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl" />
              </div>

              <div className="mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                <KeyRound className="size-3 text-amber-500" />
                Station Lock-In Verification
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Live Evaluator Portal
              </h1>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Enter your station's confidential PIN to unlock the live student rubric and scoring terminal.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="access_pin"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Station Access PIN
                </label>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="size-4" />
                  </div>

                  <input
                    ref={inputRef}
                    id="access_pin"
                    name="access_pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={10}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))
                      setError(null)
                    }}
                    placeholder="••••••"
                    className="w-full pl-10 pr-11 py-3 text-center text-lg tracking-[0.35em] font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message Banner */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in zoom-in-95">
                  <ShieldAlert className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="leading-snug">{error}</p>
                </div>
              )}

              {/* Success Feedback Card */}
              {validatedStation && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in zoom-in-95">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shrink-0">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate">Station {validatedStation.station_number}: {validatedStation.title}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                      {validatedStation.module_name} · Unlocking terminal...
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={pin.trim().length < 4 || loading || !!validatedStation}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Verifying Station Access...</span>
                  </>
                ) : validatedStation ? (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>Authenticated</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Station Rubric</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Notice */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Authorized for designated clinical examiners. All evaluations are cryptographically signed and tracked.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
