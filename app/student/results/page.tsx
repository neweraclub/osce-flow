'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileBadge,
  Fingerprint,
  GraduationCap,
  Hash,
  HelpCircle,
  KeyRound,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
} from 'lucide-react'
import { verifyStudentCredentialsAction } from '@/app/actions/studentResults'
import { ThemeToggle } from '@/components/theme-toggle'

export default function StudentResultsVerificationPage() {
  const router = useRouter()

  const [matricule, setMatricule] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Instant format validation helper for matricule
  const isMatriculeValid = matricule.trim().length >= 3

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!matricule.trim() || !firstName.trim() || !lastName.trim()) {
      setErrorMessage(
        'All verification fields are required. Please input your official Matricule, First Name, and Last Name.'
      )
      return
    }

    setLoading(true)

    try {
      const res = await verifyStudentCredentialsAction({
        matricule: matricule.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })

      if (!res.success || !res.student_id) {
        setErrorMessage(
          res.error ||
            'Candidate record not located for active academic session. Verify your Matricule, First Name, and Last Name.'
        )
        setLoading(false)
        return
      }

      // Smooth transition to certified transcript dashboard
      router.push(`/student/results/dashboard?student_id=${res.student_id}`)
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Unexpected network verification issue. Please ensure your matricule and names are entered accurately.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7FAF8] dark:bg-[#050B08] text-slate-900 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-lime-500 selection:text-black">
      {/* 1. ATMOSPHERIC CANVAS: Radial ambient illumination radiating from top-center */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(5,150,105,0.18),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-15%] right-[-10%] size-[600px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-20%] left-[-10%] size-[600px] rounded-full bg-lime-500/10 dark:bg-lime-500/5 blur-3xl"
      />

      {/* 2. TOP INSTITUTIONAL NAVIGATION STRIP */}
      <header className="relative z-10 w-full px-6 py-4 border-b border-slate-200/80 dark:border-emerald-500/15 bg-white/80 dark:bg-[#0A1510]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="size-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-lime-500 flex items-center justify-center text-white shadow-md shadow-lime-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Stethoscope className="size-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                  NEW ERA <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500 dark:from-emerald-400 dark:to-lime-400">ECOS</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-lime-300 border border-emerald-500/25 uppercase tracking-wider">
                  Registry
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-emerald-400/80 font-medium">
                Official OSCE Academic Examination Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-lime-300 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-emerald-500/20 hover:bg-slate-100 dark:hover:bg-[#102019] transition-all"
            >
              Faculty / Examiner Login
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO & TRUST ARCHITECTURE + CREDENTIAL CARD */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 my-6">
        <div className="w-full max-w-xl space-y-6">
          {/* Trust Banner / Hero Header */}
          <div className="text-center space-y-3">
            {/* Animated Pulsing Aura Shield Badge */}
            <div className="inline-flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md animate-pulse" />
              <div className="relative size-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-lime-500 text-white flex items-center justify-center shadow-xl shadow-lime-500/25 ring-4 ring-emerald-500/20">
                <ShieldCheck className="size-7" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Student Results Verification
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-emerald-400/90 font-medium max-w-md mx-auto leading-relaxed">
                Official OSCE Examination Results Registry · Cryptographically Certified Record Access
              </p>
            </div>

            {/* Cryptographic Trust Strip */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-700 dark:text-lime-300">
              <Fingerprint className="size-3.5 text-lime-500 shrink-0" />
              <span>AES-256 Verified · Real-Time Station Grading Consolidation</span>
            </div>
          </div>

          {/* Floating Credential Card (High-End Glassmorphism) */}
          <div className="rounded-2xl border border-emerald-500/30 dark:border-emerald-500/25 shadow-2xl backdrop-blur-2xl bg-white/90 dark:bg-[#0A1510]/90 p-6 sm:p-9 space-y-6 ring-1 ring-emerald-500/20">
            {/* Error Banner: Structured Crimson Glass Chip */}
            {errorMessage && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm space-y-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="size-4 text-rose-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-rose-100 leading-snug">
                      Verification Failed
                    </p>
                    <p className="text-rose-200/90 leading-relaxed text-xs">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                {/* Troubleshooting guidance */}
                <div className="pt-2 border-t border-rose-500/20 pl-11 text-[11px] text-rose-300/80 space-y-1">
                  <p className="font-semibold text-rose-200">Recommended Checks:</p>
                  <ul className="list-disc pl-3.5 space-y-0.5">
                    <li>Confirm your registration number matches your official matricule format (e.g. 2024-001).</li>
                    <li>Verify First and Last Names match your faculty registration exactly.</li>
                    <li>If recently tested, marksheets may still be undergoing examiner consolidation.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Verification Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Matricule Input (Monospace Hero Field) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="matricule"
                    className="text-xs font-bold text-slate-700 dark:text-emerald-300 flex items-center gap-1.5"
                  >
                    <Hash className="size-3.5 text-emerald-500" />
                    Student Matricule Number <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-emerald-400/60">
                    Format: # 2024-001
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="matricule"
                    type="text"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    placeholder="2024-001"
                    className="w-full px-4 py-3.5 rounded-xl text-base sm:text-lg font-mono tracking-widest bg-slate-50 dark:bg-[#102019] border border-slate-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 placeholder:text-slate-400 dark:placeholder:text-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all uppercase shadow-inner"
                    required
                    autoFocus
                  />
                  {matricule.trim() && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-lime-300 border border-emerald-500/30">
                        <CheckCircle2 className="size-3 text-lime-400" />
                        {matricule.trim().length} chars
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Name Input Grid: Side-by-Side First & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="first_name"
                    className="text-xs font-bold text-slate-700 dark:text-emerald-300 flex items-center gap-1.5"
                  >
                    <User className="size-3.5 text-emerald-500" />
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Candidate First Name..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#102019] border border-slate-200 dark:border-emerald-500/30 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="last_name"
                    className="text-xs font-bold text-slate-700 dark:text-emerald-300 flex items-center gap-1.5"
                  >
                    <User className="size-3.5 text-emerald-500" />
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Candidate Last Name..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#102019] border border-slate-200 dark:border-emerald-500/30 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Verification Action Button with ECG pulse animation on loading */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-600 hover:to-lime-500 shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:pointer-events-none relative overflow-hidden group"
                >
                  {/* Micro-glow hover overlay */}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {loading ? (
                    <div className="flex items-center gap-3">
                      {/* Medical ECG Pulse Waveform Animation */}
                      <svg
                        className="w-14 h-5 text-lime-300 shrink-0"
                        viewBox="0 0 100 30"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M0 15 L20 15 L25 10 L30 20 L35 4 L40 26 L45 15 L50 15 L55 11 L60 19 L65 15 L100 15"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="animate-pulse"
                        />
                      </svg>
                      <span className="tracking-wide">Authenticating & Computing Transcript...</span>
                    </div>
                  ) : (
                    <>
                      <Search className="size-4.5 text-lime-300" />
                      <span>Verify & Access Official Marksheet</span>
                      <ArrowRight className="size-4.5 ml-1 opacity-80 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Privacy & Authentication Trust Notice */}
            <div className="pt-4 border-t border-slate-100 dark:border-emerald-500/15 flex items-center justify-between text-[11px] text-slate-500 dark:text-emerald-400/70">
              <div className="flex items-center gap-1.5">
                <Lock className="size-3 text-emerald-500 shrink-0" />
                <span>Encrypted Academic Record Verification</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 dark:text-emerald-500/50">
                TLS 1.3 Certified
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 4. INSTITUTIONAL FOOTER */}
      <footer className="relative z-10 w-full py-5 text-center text-xs text-slate-500 dark:text-emerald-400/60 border-t border-slate-200/60 dark:border-emerald-500/15 bg-white/50 dark:bg-[#0A1510]/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            &copy; {new Date().getFullYear()} OSCE-Flow Platform • Faculty of Medicine Clinical Sciences
          </span>
          <span className="font-mono text-[11px]">
            New Era Ecos Institutional Registry System
          </span>
        </div>
      </footer>
    </div>
  )
}
