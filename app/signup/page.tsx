'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Lock,
  LogIn,
  Mail,
  User,
  UserPlus,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { SiteFooter } from '@/components/footer'

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'admin' | 'examiner' | 'student'>('admin')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const getPasswordStrength = () => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password) && password.length >= 10) score++
    return score
  }

  const strength = getPasswordStrength()

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    setLoading(true)
    setStatusMessage('')

    setTimeout(() => {
      setLoading(false)
      setStatusMessage(`Account created for ${firstName} ${lastName} (${cleanEmail}) as ${role.toUpperCase()}`)
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200 flex flex-col justify-between">
      {/* Public Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="focus:outline-none flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Activity className="size-5" />
            </span>
            NEW ERA <span className="text-blue-600 dark:text-blue-400">ECOS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <Layers className="size-4" />
              Platform
            </Link>
            <Link
              href="/#contact"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <Mail className="size-4" />
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <LogIn className="size-4" />
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md hover:shadow-blue-500/25 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <UserPlus className="size-4" />
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Layout */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12">
          
          {/* Left Side: Framed Clinical Display Card with CSS Dark Mode Inversion */}
          <div className="flex items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3 shadow-xl backdrop-blur-md overflow-hidden">
              <img 
                src="/images/signup.jpg" 
                alt="Faculty Clinical Onboarding" 
                className="w-full h-auto object-contain rounded-xl mix-blend-multiply dark:mix-blend-normal dark:invert dark:hue-rotate-180 dark:brightness-95 dark:contrast-125 transition-all duration-300"
              />
            </div>
          </div>

          {/* Right Side: Clean Signup Form */}
          <div className="p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl md:shadow-2xl md:shadow-slate-200/50 dark:md:shadow-none border border-slate-100 dark:border-slate-800">
            <div className="mb-6">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create account</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your faculty credentials to join NEW ERA ECOS.</p>
            </div>

            {statusMessage && (
              <div className="mb-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                {statusMessage}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSignup}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      required
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Sarah" 
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input 
                    required
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Benali" 
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input 
                    required
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="s.benali@univ-alger.dz" 
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input 
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters" 
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-1.5 flex gap-1 h-1 w-full">
                    <div className={`h-full flex-1 rounded-full ${strength >= 1 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength >= 2 ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength >= 3 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Faculty Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'examiner', 'student'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-full py-1.5 px-2 text-[11px] font-semibold capitalize border transition-all ${
                        role === r
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {r === 'admin' ? 'Faculty Admin' : r === 'examiner' ? 'Examiner' : 'Student'}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm shadow-md shadow-sky-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
