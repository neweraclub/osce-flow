'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { createClient } from '@/utils/supabase/client'
import { getModuleVisual } from '@/utils/getModuleIcon'

export interface AssignedModuleItem {
  id: string
  module_name: string
  level_name: string
  academic_year: string
}

export interface ProfessorProfileData {
  userId: string
  professorId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  role: string
  facultyName: string
}

export default function ProfessorProfilePage() {
  const { showSuccess, showError } = useToast()
  const supabase = createClient()

  // Initial State initialized to null / empty with explicit isLoading=true (No fake/static defaults)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [profile, setProfile] = useState<ProfessorProfileData | null>(null)
  const [assignedModules, setAssignedModules] = useState<AssignedModuleItem[]>([])

  // Section A: Personal Info Edit State (Kept empty until fetch resolves to prevent flickers)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [savingPersonal, setSavingPersonal] = useState(false)

  // Section B: Email Form State
  const [newEmail, setNewEmail] = useState('')
  const [updatingEmail, setUpdatingEmail] = useState(false)

  // Section C: Password Form State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const fetchProfileData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const res = await fetch('/api/professor/profile')
      const json = await res.json()

      if (res.ok && json.success && json.profile) {
        setProfile(json.profile)
        setAssignedModules(json.assignedModules || [])
        setFirstName(json.profile.firstName || '')
        setLastName(json.profile.lastName || '')
      } else {
        showError(json.error || 'Failed to load professor profile.')
      }
    } catch {
      showError('Network error connecting to profile service.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [])

  // Dynamic Password Validation Criteria
  const passwordCriteria = useMemo(() => {
    return [
      { label: '8+ characters', met: newPassword.length >= 8 },
      { label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
      { label: 'Lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
      { label: 'Number (0-9)', met: /[0-9]/.test(newPassword) },
      { label: 'Special symbol (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(newPassword) },
    ]
  }, [newPassword])

  const metCount = passwordCriteria.filter((c) => c.met).length
  const isPasswordValid = metCount === 5
  const isConfirmMatching = confirmPassword.length > 0 && newPassword === confirmPassword

  // Dirty State Flags
  const isPersonalDirty = Boolean(
    profile && (firstName.trim() !== profile.firstName || lastName.trim() !== profile.lastName)
  )
  const isEmailDirty = Boolean(
    newEmail.trim() && profile && newEmail.trim().toLowerCase() !== profile.email.toLowerCase()
  )

  // --- Handlers ---

  // Section A: Save Personal Information
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      showError('Please provide both first and last names.')
      return
    }

    setSavingPersonal(true)
    try {
      const res = await fetch('/api/professor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'personal',
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Personal information updated successfully.')
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                fullName: `Prof. ${firstName.trim()} ${lastName.trim()}`,
              }
            : null
        )
      } else {
        showError(json.error || 'Failed to update personal details.')
      }
    } catch {
      showError('Network error updating personal details.')
    } finally {
      setSavingPersonal(false)
    }
  }

  // Section B: Update Email via Supabase Auth & Database
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = newEmail.trim().toLowerCase()

    if (!targetEmail) {
      showError('Please enter a new email address.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(targetEmail)) {
      showError('Please enter a valid email address.')
      return
    }

    if (profile?.email && targetEmail === profile.email.toLowerCase()) {
      showError('The new email must be different from your current email.')
      return
    }

    setUpdatingEmail(true)
    try {
      // 1. Trigger Supabase Auth client confirmation flow
      try {
        await supabase.auth.updateUser({ email: targetEmail })
      } catch (sbErr) {
        console.warn('Supabase client auth updateUser warning:', sbErr)
      }

      // 2. Synchronize database record and session cookie
      const res = await fetch('/api/professor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          email: targetEmail,
        }),
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess(
          'Confirmation link sent to your new email. Please check your inbox to verify.'
        )
        setProfile((prev) => (prev ? { ...prev, email: targetEmail } : null))
        setNewEmail('')
      } else {
        showError(json.error || 'Failed to update email address.')
      }
    } catch {
      showError('Network error attempting to update email.')
    } finally {
      setUpdatingEmail(false)
    }
  }

  // Section C: Change Password via Supabase Auth & Database
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      showError('New password must be at least 8 characters long.')
      return
    }

    if (!isPasswordValid) {
      showError('Please satisfy all password security requirements.')
      return
    }

    if (newPassword !== confirmPassword) {
      showError('New password and confirmation do not match.')
      return
    }

    setUpdatingPassword(true)
    try {
      // 1. Trigger Supabase Auth password update
      try {
        await supabase.auth.updateUser({ password: newPassword })
      } catch (sbErr) {
        console.warn('Supabase client auth updateUser warning:', sbErr)
      }

      // 2. Synchronize database password hash
      const res = await fetch('/api/professor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'password',
          new_password: newPassword,
        }),
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Password updated successfully.')
        setNewPassword('')
        setConfirmPassword('')
        setShowNewPassword(false)
        setShowConfirmPassword(false)
      } else {
        showError(json.error || 'Failed to update password.')
      }
    } catch {
      showError('Network error updating security password.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const getInitials = (first?: string, last?: string) => {
    const f = (first || '').trim().charAt(0)
    const l = (last || '').trim().charAt(0)
    return (f + l).toUpperCase() || 'PR'
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Breadcrumb Navigation & Refresh Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 flex-wrap">
          <Link
            href="/professor/dashboard"
            className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight className="size-3.5 text-slate-400" />
          <span className="text-slate-900 dark:text-white font-extrabold">
            Professor Profile & Security
          </span>
        </div>

        <button
          onClick={() => fetchProfileData(true)}
          disabled={isRefreshing || isLoading}
          aria-label="Refresh profile"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-emerald-500/15 bg-white dark:bg-[#0B1612] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#12221C] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Hero Banner: Identity Anchor with Lime-Trimmed Badge */}
      {isLoading ? (
        <div className="p-6 md:p-8 rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-xl bg-slate-100 dark:bg-emerald-950/40" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-100 dark:bg-emerald-950/40 rounded-lg" />
              <div className="h-4 w-32 bg-slate-100 dark:bg-emerald-950/40 rounded-lg" />
            </div>
          </div>
          <div className="h-14 w-32 bg-slate-100 dark:bg-emerald-950/40 rounded-xl" />
        </div>
      ) : profile ? (
        <div className="p-6 md:p-8 rounded-xl bg-gradient-to-br from-[#060D0A] via-[#0B1612] to-[#12221C] border border-emerald-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 via-lime-500/5 to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              {/* Visual Anchor: Lime-trimmed glowing initials badge */}
              <div className="size-16 rounded-xl ring-2 ring-lime-400/40 bg-emerald-900/50 text-lime-300 flex items-center justify-center font-mono font-black text-xl shadow-lg shadow-lime-500/10">
                {getInitials(profile.firstName, profile.lastName)}
              </div>
              <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-500 border-2 border-[#060D0A] flex items-center justify-center text-white shadow-xs">
                <CheckCircle2 className="size-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  {profile.fullName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Clinical Professor
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {profile.facultyName || 'Faculty of Medicine'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="px-5 py-2.5 rounded-xl bg-emerald-950/60 backdrop-blur-md border border-emerald-500/30 text-center min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Assigned Modules
              </span>
              <span className="text-xl font-mono font-black text-lime-400 tabular-nums">
                {assignedModules.length}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Content Area */}
      {isLoading ? (
        /* Skeleton Loaders */
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 space-y-4">
              <div className="h-5 w-48 bg-slate-100 dark:bg-emerald-950/40 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="h-24 bg-slate-100 dark:bg-emerald-950/40 rounded-xl" />
                <div className="h-24 bg-slate-100 dark:bg-emerald-950/40 rounded-xl" />
              </div>
            </div>
            <div className="lg:col-span-6 p-6 rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 space-y-4">
              <div className="h-5 w-48 bg-slate-100 dark:bg-emerald-950/40 rounded-lg" />
              <div className="h-10 bg-slate-100 dark:bg-emerald-950/40 rounded-xl" />
              <div className="h-10 bg-slate-100 dark:bg-emerald-950/40 rounded-xl" />
            </div>
          </div>
        </div>
      ) : !profile ? (
        <div className="p-12 rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 text-center space-y-3">
          <AlertCircle className="size-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile Unavailable</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Could not resolve your professor identity details. Please verify your authentication session.
          </p>
          <button
            onClick={() => fetchProfileData(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* TWO-COLUMN SPLIT LAYOUT: Supervised Modules & Identity Form  */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ------------------------------------------------------------ */}
            {/* LEFT COLUMN: Supervised Clinical Modules as Organ Cards     */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-500/15">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <BookOpen className="size-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Supervised Clinical Modules
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Organ specialty disciplines under your direct evaluation
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {assignedModules.length} Total
                </span>
              </div>

              {assignedModules.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-50 dark:bg-[#12221C] border border-slate-200/60 dark:border-emerald-500/20 text-center space-y-2">
                  <GraduationCap className="size-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No modules currently assigned.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Your faculty dean assigns clinical modules to professors. Once assigned, their organ cards will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedModules.map((m) => {
                    const visual = getModuleVisual(m.module_name)
                    const FallbackIcon = visual.fallbackIcon

                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 space-y-2.5 hover:border-emerald-500/40 transition-all shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                              <FallbackIcon className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={m.module_name}>
                                {m.module_name}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-medium">
                                {visual.specialty}
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                            {m.level_name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-2 border-t border-slate-100 dark:border-emerald-500/10">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3 text-emerald-500 shrink-0" />
                            <span>Academic Cycle: {m.academic_year}</span>
                          </div>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            OSCE Track
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------ */}
            {/* RIGHT COLUMN: Profile Form Fields with Dirty-State Indicators */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-7 space-y-6">
              {/* Personal Information Form */}
              <div className="p-6 rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-500/15">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                      <User className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Personal Information
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Official examiner name displayed on evaluation transcripts
                      </p>
                    </div>
                  </div>

                  {isPersonalDirty && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-lime-400/20 text-lime-700 dark:text-lime-300 border border-lime-400/30 animate-pulse">
                      Unsaved Name Changes
                    </span>
                  )}
                </div>

                <form onSubmit={handleSavePersonal} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        First Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#12221C] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Last Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#12221C] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingPersonal || !isPersonalDirty}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {savingPersonal ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="size-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Official Email Settings Form */}
              <div className="p-6 rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-500/15">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Official Institutional Email
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Authentication address and official academic communications
                      </p>
                    </div>
                  </div>

                  {isEmailDirty && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-lime-400/20 text-lime-700 dark:text-lime-300 border border-lime-400/30 animate-pulse">
                      Pending Email Change
                    </span>
                  )}
                </div>

                <form onSubmit={handleUpdateEmail} className="space-y-4">
                  {/* Current Email (Read-Only) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Current Active Email
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input
                        type="email"
                        disabled
                        value={profile.email}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#12221C] border border-slate-200 dark:border-emerald-500/15 rounded-xl text-xs font-mono font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                      />
                    </div>
                  </div>

                  {/* New Email Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      New Official Institutional Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="e.g. professor.updated@fac-med.dz"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#12221C] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      A verification link will be dispatched to confirm institutional domain ownership.
                    </p>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={updatingEmail || !isEmailDirty}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {updatingEmail ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Dispatching Verification...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="size-3.5" />
                          <span>Update Institutional Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION C: Security & Password Card with Dynamic Checklist    */}
          {/* ============================================================ */}
          <div className="p-6 md:p-8 rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-500/15">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <KeyRound className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Security Credentials &amp; Password
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Update evaluation portal password with live strength verification
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">Strength:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${
                    metCount === 5
                      ? 'bg-lime-400/20 text-lime-700 dark:text-lime-300 border-lime-400/30'
                      : metCount >= 3
                      ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/30'
                      : 'bg-rose-400/20 text-rose-700 dark:text-rose-300 border-rose-400/30'
                  }`}
                >
                  {metCount === 5 ? 'Strong' : metCount >= 3 ? 'Medium' : 'Weak'} ({metCount}/5)
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Input Fields */}
                <div className="space-y-4">
                  {/* New Password Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      New Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter robust password"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-[#12221C] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="Toggle new password visibility"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password Input with Match Indicator */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm entered password"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-[#12221C] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    {/* Match Indicator */}
                    {confirmPassword && (
                      <div className="pt-1">
                        {isConfirmMatching ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-lime-600 dark:text-lime-400">
                            <Check className="size-3.5 stroke-[2.5]" />
                            <span>Passwords match</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                            <X className="size-3.5 stroke-[2.5]" />
                            <span>Passwords do not match</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Dynamic Password Requirements Checklist */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Security Requirements Checklist
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {metCount} of 5 Met
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-emerald-950/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        metCount === 5
                          ? 'bg-gradient-to-r from-emerald-500 to-lime-400'
                          : metCount >= 3
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${(metCount / 5) * 100}%` }}
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    {passwordCriteria.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs">
                        <div
                          className={`size-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            c.met
                              ? 'bg-lime-400/20 text-lime-600 dark:text-lime-300 border border-lime-400/40'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border border-transparent'
                          }`}
                        >
                          {c.met ? (
                            <Check className="size-2.5 stroke-[3]" />
                          ) : (
                            <span className="size-1 rounded-full bg-slate-400" />
                          )}
                        </div>
                        <span
                          className={`text-xs transition-colors ${
                            c.met
                              ? 'font-bold text-slate-900 dark:text-slate-200'
                              : 'text-slate-400 dark:text-slate-500 font-normal'
                          }`}
                        >
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-emerald-500/15">
                <button
                  type="submit"
                  disabled={updatingPassword || !isPasswordValid || !isConfirmMatching}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {updatingPassword ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
