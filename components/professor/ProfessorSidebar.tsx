'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  X,
  ExternalLink,
} from 'lucide-react'

export function ProfessorSidebar({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}) {
  const pathname = usePathname()
  const [professorName, setProfessorName] = useState<string | null>(null)
  const [facultyName, setFacultyName] = useState<string | null>(null)
  const [initials, setInitials] = useState<string>('PR')
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user) {
            if (data.user.facultyName) setFacultyName(data.user.facultyName)
            const fn = data.user.firstName || ''
            const ln = data.user.lastName || ''
            if (fn || ln) {
              setProfessorName(`Prof. ${fn} ${ln}`.trim())
              const init = `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || 'PR'
              setInitials(init)
            } else {
              setProfessorName('Professor')
            }
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
        if (fn || ln) {
          setProfessorName(`Prof. ${fn} ${ln}`.trim())
          const init = `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || 'PR'
          setInitials(init)
        }
        if (detail.facultyName) {
          setFacultyName(detail.facultyName)
        }
      }
    }

    window.addEventListener('ecos:user-updated', handleUserUpdate)
    return () => {
      window.removeEventListener('ecos:user-updated', handleUserUpdate)
    }
  }, [])

  const navItems = [
    { label: 'Overview Dashboard', href: '/professor/dashboard', icon: LayoutDashboard },
    { label: 'Stations', href: '/professor/stations', icon: Layers },
    { label: 'Student Performance & Transcripts', href: '/professor/students', icon: GraduationCap },
    { label: 'Clinical Deductions & Penalties', href: '/professor/penalties', icon: ShieldAlert },
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0B1612] border-r border-slate-200/80 dark:border-emerald-500/15 flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-screen`}
      >
        {/* Brand & Faculty Context Header */}
        <div className="p-5 border-b border-slate-100 dark:border-emerald-500/15 space-y-4">
          <div className="flex items-center justify-between">
            <Link href="/professor/dashboard" className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-lime-500 text-white shadow-md shadow-lime-500/20 shrink-0">
                <Stethoscope className="size-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base truncate">
                  NEW ERA <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500 dark:from-emerald-400 dark:to-lime-400">ECOS</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Professor Portal
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Visual Anchor: Professor's initials in glowing lime-trimmed badge */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/20 flex items-center gap-3">
            <div className="size-10 rounded-xl ring-2 ring-lime-400/40 bg-emerald-900/50 text-lime-300 font-bold flex items-center justify-center text-sm shadow-sm shadow-lime-500/20 shrink-0 font-mono">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {loadingSession ? 'Loading...' : professorName || 'Clinical Professor'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 className="size-3 text-emerald-500 shrink-0" />
                <span className="text-[10px] font-medium text-slate-500 dark:text-emerald-400/80 truncate">
                  {facultyName || 'Medical Faculty'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/professor/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all relative group ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-[#12221C] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {/* Glowing Lime Left Accent Bar for Active Link */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-lime-400 shadow-sm shadow-lime-400/50" />
                )}
                <Icon
                  className={`size-4.5 transition-colors ${
                    isActive
                      ? 'text-emerald-600 dark:text-lime-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Persistent Examiner Dock */}
        <div className="p-3 border-t border-slate-100 dark:border-emerald-500/15">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/25 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-lime-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-lime-400">
                  Examiner Mode
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <Link
              href="/examiner"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all group"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-lime-300" />
                <span>Launch Station</span>
              </div>
              <ExternalLink className="size-3 opacity-70 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
