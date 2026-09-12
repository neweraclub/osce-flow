'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { SiteFooter } from '@/components/footer'
import { PublicHeader } from '@/components/public-header'

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
        setError(data.error || 'Invalid station access PIN. Please verify with the exam administrator.')
        setLoading(false)
        return
      }

      setValidatedStation(data.station)

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('evaluator_station', JSON.stringify(data.station))
        sessionStorage.setItem('evaluator_exams', JSON.stringify(data.exams || []))
        sessionStorage.setItem('evaluator_pin', pin.trim())
        localStorage.setItem('last_evaluator_station_id', data.station.id)
        document.cookie = `evaluator_station_id=${data.station.id}; path=/; max-age=86400; SameSite=Lax`
      }

      setTimeout(() => {
        router.push(`/evaluator/dashboard?station_id=${data.station.id}`)
      }, 500)
    } catch (err: any) {
      setError(err?.message || 'Network error while validating station PIN.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200 flex flex-col justify-between">
      {/* Navigation Header */}
      <PublicHeader />

      {/* Main 2-Column Authentication Layout */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12">
          {/* Left Column: Visual Card */}
          <div className="flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xl md:shadow-2xl md:shadow-slate-200/50 dark:md:shadow-none flex items-center justify-center overflow-hidden">
              <img
                src="/examiner.gif"
                alt="Examiner Station Terminal"
                className="w-full h-auto max-h-[360px] object-contain rounded-2xl"
              />
            </div>
          </div>

          {/* Right Column: PIN Form Card */}
          <div className="p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl md:shadow-2xl md:shadow-slate-200/50 dark:md:shadow-none border border-slate-200/80 dark:border-slate-800">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Station Access
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter station PIN to unlock scoring rubric.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="access_pin"
                  className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
                >
                  Station Access PIN
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
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
                    className="w-full pl-11 pr-11 py-3 text-center text-lg tracking-[0.35em] font-mono font-bold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full text-slate-900 dark:text-white placeholder-slate-400 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
                  <p className="leading-snug">{error}</p>
                </div>
              )}

              {validatedStation && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                  <p className="font-semibold truncate">
                    Station {validatedStation.station_number}: {validatedStation.title} unlocked. Redirecting...
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={pin.trim().length < 4 || loading || !!validatedStation}
                className="w-full py-3.5 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Unlocking Station...</span>
                  </>
                ) : validatedStation ? (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>Station Unlocked</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Station</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
              Station examiner with institutional credentials?{' '}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  )
}
