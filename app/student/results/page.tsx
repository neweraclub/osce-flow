'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Hash,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!matricule.trim() || !firstName.trim() || !lastName.trim()) {
      setErrorMessage(
        'Student credentials not found. Please verify your Matricule, First Name, and Last Name.'
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
            'Student credentials not found. Please verify your Matricule, First Name, and Last Name.'
        )
        setLoading(false)
        return
      }

      // Redirect immediately to student results dashboard
      router.push(`/student/results/dashboard?student_id=${res.student_id}`)
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Student credentials not found. Please verify your Matricule, First Name, and Last Name.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-teal-400/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-10 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="size-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Stethoscope className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              OSCE-Flow
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300/60 dark:border-teal-800/60 uppercase">
                Student
              </span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Medical Examination Portal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Examiner / Faculty Login
          </Link>
        </div>
      </header>

      {/* Main Verification Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-8">
        <div className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-slate-300/30 dark:shadow-black/50 space-y-7">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 shadow-sm mb-1">
              <GraduationCap className="size-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Student Results Verification
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Access your certified OSCE station marks, weighted grade breakdown, and module pass status.
            </p>
          </div>

          {/* Inline Error Display */}
          {errorMessage && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in zoom-in-95 duration-150"
            >
              <AlertCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Matricule Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="matricule"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Hash className="size-3.5 text-teal-500" />
                  Student Matricule Number <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">e.g. 2024-001</span>
              </label>
              <input
                id="matricule"
                type="text"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                placeholder="Enter your student registration / matricule..."
                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all font-mono"
                required
                autoFocus
              />
            </div>

            {/* First Name Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="first_name"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <User className="size-3.5 text-teal-500" />
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="first_name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your official first name..."
                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                required
              />
            </div>

            {/* Last Name Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="last_name"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <User className="size-3.5 text-teal-500" />
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="last_name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your official last name..."
                className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-teal-600 to-teal-400 hover:from-teal-700 hover:to-teal-500 shadow-lg shadow-teal-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    <span>Verify & View Results</span>
                    <ArrowRight className="size-4 ml-1 opacity-70" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Privacy & Authentication Trust Notice */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
            <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
            <span>Encrypted Academic Record Verification · Confidential & Certified</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50">
        &copy; {new Date().getFullYear()} OSCE-Flow Platform. Faculty of Medicine & Clinical Sciences.
      </footer>
    </div>
  )
}
