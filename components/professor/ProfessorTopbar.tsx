'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LogOut,
  Menu,
  Stethoscope,
  User,
  ShieldCheck,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useToast } from '@/context/ToastContext'
import { NavbarYearSelector } from '@/components/dean/NavbarYearSelector'
import { SignOutOverlay } from '@/components/ui/SignOutOverlay'

export function ProfessorTopbar({
  setSidebarOpen,
}: {
  setSidebarOpen: (open: boolean) => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { showSuccess } = useToast()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [userProfile, setUserProfile] = useState<{
    name: string
    email: string
    faculty: string
  } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    async function loadSession() {
      try {
        const sessionRes = await fetch('/api/auth/session')
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          if (sessionData.authenticated && sessionData.user) {
            setUserProfile({
              name: `Prof. ${sessionData.user.firstName || ''} ${sessionData.user.lastName || ''}`.trim() || 'Professor',
              email: sessionData.user.email || '',
              faculty: sessionData.user.facultyName || 'Medical Faculty',
            })
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoadingSession(false)
      }
    }
    loadSession()

    const handleUserUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) {
        const fn = detail.firstName || ''
        const ln = detail.lastName || ''
        setUserProfile((prev) => ({
          name: `Prof. ${fn} ${ln}`.trim() || 'Professor',
          email: prev?.email || '',
          faculty: detail.facultyName || prev?.faculty || 'Medical Faculty',
        }))
      }
    }

    window.addEventListener('ecos:user-updated', handleUserUpdate)
    return () => {
      window.removeEventListener('ecos:user-updated', handleUserUpdate)
    }
  }, [])

  // Inline path chip array with monospace text for IDs
  const renderBreadcrumbs = () => {
    const parts: { label: string; href?: string; isId?: boolean }[] = [
      { label: 'Professor', href: '/professor/dashboard' },
    ]

    if (pathname === '/professor/dashboard') {
      parts.push({ label: 'Overview Cockpit' })
    } else if (pathname === '/professor/stations') {
      parts.push({ label: 'Stations' })
    } else if (pathname.startsWith('/professor/stations/')) {
      parts.push({ label: 'Stations', href: '/professor/stations' })
      const sub = pathname.replace('/professor/stations/', '').split('/')
      if (sub[0]) {
        parts.push({ label: sub[0].slice(0, 8), isId: true })
      }
      if (sub[1] === 'exams' && sub[2]) {
        parts.push({ label: 'Live Monitor' })
        parts.push({ label: sub[2].slice(0, 8), isId: true })
      } else if (sub.length === 1) {
        parts.push({ label: 'Rubric Designer' })
      }
    } else if (pathname.startsWith('/professor/students')) {
      parts.push({ label: 'Student Transcripts' })
    } else if (pathname.startsWith('/professor/penalties')) {
      parts.push({ label: 'Clinical Deductions' })
    } else if (pathname === '/professor/profile') {
      parts.push({ label: 'Profile Settings' })
    }

    return (
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
        {parts.map((p, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="size-3 text-slate-400 dark:text-slate-600" />}
            {p.href && idx < parts.length - 1 ? (
              <Link
                href={p.href}
                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {p.label}
              </Link>
            ) : (
              <span
                className={`font-bold ${
                  p.isId
                    ? 'font-mono text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {p.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>
    )
  }

  const handleSignOut = async () => {
    if (loggingOut) return
    setDropdownOpen(false)
    setLoggingOut(true)

    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Proceed with client logout
    }

    setTimeout(() => {
      showSuccess('Signed out successfully.')
      window.location.href = '/login'
    }, 700)
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-[#0B1612]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-emerald-500/15 px-4 md:px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#12221C] transition-colors"
        >
          <Menu className="size-5" />
        </button>

        {/* Dynamic Breadcrumbs Strip */}
        {renderBreadcrumbs()}
      </div>

      {/* Right Controls: Direct Mode Switcher + Academic Year Selector + Theme + User Menu */}
      <div className="flex items-center gap-2.5">
        {/* Direct Mode Switcher with emerald-to-lime border gradient */}
        <Link
          href="/examiner"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#12221C] text-emerald-700 dark:text-lime-300 border border-emerald-500/40 hover:border-lime-400 hover:shadow-md hover:shadow-lime-500/15 transition-all group"
          title="Direct Examiner Mode Switcher"
        >
          <span className="size-1.5 rounded-full bg-lime-400 animate-pulse" />
          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-lime-400" />
          <span>Examiner Mode</span>
        </Link>

        {/* Compact Year Selector with Session Active LED */}
        <NavbarYearSelector />

        {/* Theme Toggle in 32px height container */}
        <ThemeToggle />

        {/* User Profile Dropdown in 32px container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={loggingOut}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#12221C] transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:pointer-events-none"
          >
            <div className="size-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-lime-500 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-lime-500/20 border border-lime-400/30 shrink-0">
              <Stethoscope className="size-4" />
            </div>
            {loadingSession ? (
              <div className="hidden md:flex flex-col gap-1 py-0.5 animate-pulse">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-2 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ) : (
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
                  {userProfile?.name || 'Professor'}
                </span>
                <span className="text-[10px] font-semibold text-lime-600 dark:text-lime-400 leading-tight">
                  Evaluator
                </span>
              </div>
            )}
            <ChevronDown
              className={`size-3.5 text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Floating Dropdown Panel */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-emerald-500/20 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* User Meta Header */}
              <div className="p-3 border-b border-slate-100 dark:border-white/[0.06] space-y-1">
                {loadingSession ? (
                  <div className="space-y-1.5 animate-pulse">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {userProfile?.name || 'Clinical Professor'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {userProfile?.email || 'professor@faculty.dz'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 pt-1 text-[10px] text-emerald-600 dark:text-lime-400 font-semibold">
                      <Building2 className="size-3 shrink-0" />
                      <span className="truncate">{userProfile?.faculty || 'Medical Faculty'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Links */}
              <div className="py-1 space-y-0.5">
                <Link
                  href="/professor/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
                >
                  <User className="size-3.5 text-slate-400" />
                  <span>Profile &amp; Credentials</span>
                </Link>

                <Link
                  href="/professor/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
                >
                  <GraduationCap className="size-3.5 text-slate-400" />
                  <span>Overview Dashboard</span>
                </Link>

                <Link
                  href="/examiner"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 dark:text-lime-300 hover:bg-emerald-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-lime-400" />
                    <span>Direct Examiner Station</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
                    PIN
                  </span>
                </Link>
              </div>

              {/* Sign Out Trigger */}
              <div className="pt-1 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="size-3.5" />
                  <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SignOutOverlay
        isOpen={loggingOut}
        title="Signing out clinical evaluator session..."
        subtitle="Clearing your encrypted clinical session and local examination cache..."
      />
    </header>
  )
}
