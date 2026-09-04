'use client'

import React, { useState, useEffect } from 'react'
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export interface ProfileUserData {
  id: string
  email: string
  role: string
  firstName: string
  lastName: string
  facultyId: string | null
  facultyName: string
}

export default function ProfileView() {
  const { showSuccess, showError } = useToast()

  const [user, setUser] = useState<ProfileUserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Email form state
  const [emailInput, setEmailInput] = useState('')
  const [updatingEmail, setUpdatingEmail] = useState(false)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const fetchProfile = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/auth/profile')
      const json = await res.json()

      if (res.ok && json.success) {
        setUser(json.user)
        setEmailInput(json.user.email)
      } else {
        showError(json.error || 'Failed to fetch account profile.')
      }
    } catch {
      showError('Network error loading account profile.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      showError('Please enter a valid institutional email address.')
      return
    }

    setUpdatingEmail(true)

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          email: emailInput.trim(),
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess(json.message || 'Institutional email updated successfully.')
        fetchProfile(true)
      } else {
        showError(json.error || 'Failed to update email.')
      }
    } catch {
      showError('Network error updating email address.')
    } finally {
      setUpdatingEmail(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword) {
      showError('Please enter your current password.')
      return
    }

    if (!newPassword || newPassword.length < 8) {
      showError('New password must contain at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      showError('New password and confirmation do not match.')
      return
    }

    setUpdatingPassword(true)

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'password',
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Password updated successfully.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        showError(json.error || 'Failed to update password.')
      }
    } catch {
      showError('Network error updating security password.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const getInitials = (firstName: string, lastName: string, email: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    if (firstName) return firstName.substring(0, 2).toUpperCase()
    return email ? email.substring(0, 2).toUpperCase() : 'ME'
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="size-8 animate-spin mx-auto mb-3 text-blue-500" />
        <p className="text-xs font-semibold">Loading profile parameters...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <p className="text-xs text-rose-500 font-semibold">Unable to load account identity.</p>
        <button
          onClick={() => fetchProfile(true)}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          Try Again
        </button>
      </div>
    )
  }

  const initials = getInitials(user.firstName, user.lastName, user.email)
  const isSuperadmin = user.role === 'superadmin'

  return (
    <div className="w-full space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Profile & Account Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your administrative identity, email parameters, and security credentials.
          </p>
        </div>
        <button
          onClick={() => fetchProfile(true)}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          title="Refresh profile details"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 2-Column Balanced Widescreen Grid (1/3 Left, 2/3 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Account Identity & Assigned Faculty (4 cols = 1/3 width) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <User className="size-4 text-blue-500" />
              <span>Account Overview</span>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <div className="relative mb-3">
                <div className="size-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-blue-500/20">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white">
                  <CheckCircle2 className="size-3.5" />
                </div>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-full" title={user.email}>
                {user.email}
              </p>

              <div className="mt-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isSuperadmin
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
                }`}>
                  <ShieldCheck className="size-3.5" />
                  {isSuperadmin ? 'Superadministrator' : 'Faculty Dean'}
                </span>
              </div>
            </div>

            {/* Assigned Institution Card */}
            <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-sky-600 dark:text-sky-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Assigned Institution
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/50">
                  Permanent Assignment
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                {user.facultyName}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Grouped Interactive Forms (8 cols = 2/3 width) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 2: Institutional Email Management */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Mail className="size-4 text-blue-500" />
              <span>Institutional Email Address</span>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Primary Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                    <Mail className="size-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Used for institutional communications and security recovery alerts.
                </p>
              </div>

              <button
                type="submit"
                disabled={updatingEmail}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {updatingEmail ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>Update Email</span>
              </button>
            </form>
          </div>

          {/* SECTION 3: Security & Password Credentials */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Lock className="size-4 text-blue-500" />
              <span>Security & Password Credentials</span>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                    <KeyRound className="size-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                      <Lock className="size-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                      <Lock className="size-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Minimum 8 characters with upper & lower case, numbers, and special characters.
              </p>

              <button
                type="submit"
                disabled={updatingPassword}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {updatingPassword ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
