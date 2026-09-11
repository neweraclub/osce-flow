'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Shield,
  Stethoscope,
  User,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { createClient } from '@/utils/supabase/client'

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

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [profile, setProfile] = useState<ProfessorProfileData | null>(null)
  const [assignedModules, setAssignedModules] = useState<AssignedModuleItem[]>([])

  // Section A: Personal Info Edit State
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
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/professor/profile')
      const json = await res.json()

      if (res.ok && json.success) {
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
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [])

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
      // 1. Supabase Auth client trigger
      try {
        await supabase.auth.updateUser({ email: targetEmail })
      } catch (sbErr) {
        console.warn('Supabase client auth updateUser warning:', sbErr)
      }

      // 2. Database update and token synchronization
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

    if (newPassword !== confirmPassword) {
      showError('New password and confirmation do not match.')
      return
    }

    setUpdatingPassword(true)
    try {
      // 1. Supabase Auth trigger
      try {
        await supabase.auth.updateUser({ password: newPassword })
      } catch (sbErr) {
        console.warn('Supabase client auth updateUser warning:', sbErr)
      }

      // 2. Database update
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

  const getInitials = (first: string, last: string) => {
    const f = (first || '').trim().charAt(0)
    const l = (last || '').trim().charAt(0)
    return (f + l).toUpperCase() || 'PR'
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
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
            Professor Profile
          </span>
        </div>

        <button
          onClick={() => fetchProfileData(true)}
          disabled={refreshing || loading}
          aria-label="Refresh profile"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Page Title & Subtitle Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="size-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/25">
              {profile ? getInitials(profile.firstName, profile.lastName) : 'PR'}
            </div>
            <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-xs">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                {profile?.fullName || 'Professor Profile'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Professor
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {profile?.facultyName || 'Medical Faculty'} • Institutional Academic Identity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Assigned Modules
            </span>
            <span className="text-lg font-black text-emerald-400">
              {assignedModules.length}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        /* Skeleton Loading State */
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4">
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4">
              <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
            </div>
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4">
              <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
            </div>
          </div>
        </div>
      ) : !profile ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <AlertCircle className="size-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile Unavailable</h3>
          <p className="text-xs text-slate-400">
            Could not load your professor identity details. Please try refreshing.
          </p>
          <button
            onClick={() => fetchProfileData(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* SECTION A: Personal Information & Assigned Modules           */}
          {/* ============================================================ */}
          <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <User className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Section A: Personal Information &amp; Assigned Modules
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400">
                    Your institutional identity and academic module responsibilities
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                Role: Professor
              </span>
            </div>

            {/* Personal Details Form */}
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
                      placeholder="e.g. John"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      placeholder="e.g. Doe"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={
                    savingPersonal ||
                    (firstName.trim() === profile.firstName && lastName.trim() === profile.lastName)
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingPersonal ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      <span>Save Name Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Assigned Modules Subsection */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Assigned Clinical Modules ({assignedModules.length})</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  Modules where responsible_prof_id = You
                </span>
              </div>

              {assignedModules.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-center space-y-1.5">
                  <GraduationCap className="size-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No Clinical Modules Currently Assigned
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Your faculty dean assigns modules to professors. Once assigned, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assignedModules.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2 hover:border-emerald-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {m.module_name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 shrink-0">
                          {m.level_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                        <Calendar className="size-3 text-emerald-500 shrink-0" />
                        <span>Academic Cycle: {m.academic_year}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION B & C: Side-by-Side Widescreen Cards                 */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* ------------------------------------------------------------ */}
            {/* SECTION B: Update Email Settings Card                        */}
            {/* ------------------------------------------------------------ */}
            <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Mail className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Section B: Update Email Settings
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400">
                    Institutional email and verification link delivery
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateEmail} className="space-y-4">
                {/* Current Email (Disabled/Read-only) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Current Email Address (Active)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-mono font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Currently linked to your authenticated professor account.
                  </p>
                </div>

                {/* New Email Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    New Institutional Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. professor.new@institution.dz"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    A confirmation link will be sent to this address to verify ownership.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingEmail || !newEmail.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {updatingEmail ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Sending Confirmation...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="size-4" />
                        <span>Update Email Address</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* SECTION C: Change Password Card                              */}
            {/* ------------------------------------------------------------ */}
            <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <KeyRound className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Section C: Change Password
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400">
                    Update your portal login password (minimum 8 characters)
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    New Password * (Min 8 characters)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Toggle new password visibility"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] font-bold text-rose-500">
                      Passwords do not match.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      updatingPassword ||
                      newPassword.length < 8 ||
                      newPassword !== confirmPassword
                    }
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {updatingPassword ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="size-4" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
