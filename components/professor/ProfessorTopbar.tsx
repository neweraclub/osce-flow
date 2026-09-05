'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Loader2,
  LogOut,
  Menu,
  Stethoscope,
  User,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useToast } from '@/context/ToastContext'
import { NavbarYearSelector } from '@/components/dean/NavbarYearSelector'

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
  const [userProfile, setUserProfile] = useState<{
    name: string
    email: string
    faculty: string
  }>({
    name: 'Professor',
    email: '',
    faculty: 'Medical Faculty',
  })
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
      }
    }
    loadSession()
  }, [])

  const getBreadcrumbTitle = () => {
    if (pathname === '/professor/modules') return 'My Clinical Modules'
    if (pathname === '/professor/stations') return 'Station Blueprints & Rubrics'
    if (pathname === '/professor/profile') return 'Profile Settings'
    return 'Professor Dashboard'
  }

  const handleSignOut = async () => {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Proceed with client logout
    } finally {
      showSuccess('Signed out successfully.')
      router.push('/login')
    }
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="size-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
          <Link
            href="/professor/dashboard"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Professor Portal
          </Link>
          <ChevronRight className="size-3.5 text-slate-400" />
          <span className="text-slate-800 dark:text-slate-200 font-bold">
            {getBreadcrumbTitle()}
          </span>
        </div>
      </div>

      {/* Right Controls: Academic Year Selector + Theme + User Menu */}
      <div className="flex items-center gap-3.5">
        <NavbarYearSelector />

        <ThemeToggle />

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-xs shadow-md shadow-emerald-500/20">
              <Stethoscope className="size-4" />
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[120px]">
                {userProfile.name}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Professor / Examiner
              </span>
            </div>
            <ChevronDown
              className={`size-3.5 text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Floating Dropdown Panel */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* User Meta Header */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                  {userProfile.name}
                </span>
                <span className="text-[11px] text-slate-400 block truncate">
                  {userProfile.email}
                </span>
                <div className="flex items-center gap-1.5 pt-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    Faculty Examiner
                  </span>
                </div>
              </div>

              {/* Faculty Identifier */}
              <div className="p-2.5 my-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                <Building2 className="size-3.5 text-slate-400 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                  {userProfile.faculty}
                </span>
              </div>

              {/* Logout Action */}
              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50 mt-1"
              >
                {loggingOut ? (
                  <Loader2 className="size-4 animate-spin text-rose-600" />
                ) : (
                  <LogOut className="size-4" />
                )}
                <span>Sign Out of Portal</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
