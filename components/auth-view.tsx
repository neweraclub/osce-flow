'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react'

interface AuthViewProps {
  initialMode?: 'login' | 'register'
  onSuccess?: () => void
}

export function AuthView({ initialMode = 'login', onSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (onSuccess) onSuccess()
    }, 1200)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 transition-colors duration-200 flex items-center justify-center p-6 sm:p-10">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-blue-900/10 dark:shadow-black/50 overflow-hidden bg-white dark:bg-slate-900">
        {/* LEFT COLUMN: Medical Vector Illustration Scene */}
        <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-8 sm:p-10 text-white min-h-[460px]">
          <div className="absolute top-10 left-10 w-24 h-24 bg-blue-400/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-16 right-12 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white border border-white/25">
              <Activity className="size-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">NEW ERA ECOS</span>
          </div>

          <div className="relative z-10 my-auto py-6 max-w-sm w-full mx-auto flex flex-col items-center">
            <svg viewBox="0 0 400 400" className="w-full max-w-[280px] h-auto drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="200" cy="200" r="160" fill="#2563EB" fillOpacity="0.3" />
              <path d="M160 210 C160 170 240 170 240 210 L250 320 L150 320 Z" fill="#38BDF8" />
              <circle cx="200" cy="140" r="40" fill="#FDE047" />
              <path d="M185 180 C185 220 215 220 215 180" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              <circle cx="200" cy="225" r="8" fill="#E2E8F0" />
              <rect x="80" y="120" width="30" height="12" rx="6" transform="rotate(-30 80 120)" fill="#67E8F9" opacity="0.8" />
              <circle cx="310" cy="140" r="10" fill="#93C5FD" opacity="0.8" />
              <rect x="290" y="240" width="24" height="24" rx="4" fill="#67E8F9" opacity="0.7" />
              <path d="M296 252 H308 M302 246 V258" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-white tracking-tight text-center">
              Next-Gen Medical Assessment
            </h2>
            <p className="mt-2 text-xs text-blue-100/80 text-center max-w-xs leading-relaxed">
              Objective structured clinical exams powered by seamless real-time invigilation.
            </p>
          </div>

          <div className="relative z-10 text-center">
            <span className="inline-block px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-medium text-blue-100 border border-white/15">
              Faculty Workspace • Algerian Medical Education
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Minimalist Form */}
        <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 md:p-14 flex flex-col justify-center">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {mode === 'login' ? 'Welcome!' : 'Create account'}
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {mode === 'login'
                  ? 'Please enter your institutional credentials to sign in.'
                  : 'Enter your details to create your faculty account.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  YOUR E-MAIL
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-500">
                    <Mail className="size-4" />
                  </div>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@faculty.edu.dz"
                    className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  YOUR PASSWORD
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-500">
                    <Lock className="size-4" />
                  </div>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-11 pr-11 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="size-4 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 dark:bg-slate-800"
                    />
                    <span>Remember my password</span>
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault()
                      alert('Password reset link sent to your institutional address.')
                    }}
                    className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-sm py-3.5 px-8 shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {mode === 'login' ? 'Sign in' : 'Create account'}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
