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
  User,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useToast } from '@/context/ToastContext'
import { useAcademicYear } from '@/context/AcademicYearContext'

export function DeanTopbar({
  setSidebarOpen,
}: {
  setSidebarOpen: (open: boolean) => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { showSuccess } = useToast()
  const {
    years,
    selectedYearId,
    selectedYear,
    setSelectedYearId,
    isLoading: yearsLoading,
  } = useAcademicYear()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [facultyName, setFacultyName] = useState<string>('')
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
    async function loadFaculty() {
      try {
        const sessionRes = await fetch('/api/auth/session')
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          if (sessionData.authenticated && sessionData.user?.facultyName) {
            setFacultyName(sessionData.user.facultyName)
          }
        }
      } catch {
        // Fallback
      }
    }
    loadFaculty()
  }, [])

  const getBreadcrumbTitle = () => {
    if (pathname === '/dean/academic-years') return 'Academic Years'
    if (pathname === '/dean/structure') return 'Academic Hierarchy'
    if (pathname === '/dean/modules') return 'Clinical Modules'
    if (pathname === '/dean/professors') return 'Professors Roster'
    if (pathname === '/dean/students') return 'Student Cohorts'
    if (pathname === '/dean/profile') return 'Profile Settings'
    return 'Dean Dashboard'
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
          className="md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg"
        >
          <Menu className="size-5" />
        </button>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 dark:text-slate-500 font-medium">Faculty Administration</span>
          <ChevronRight className="size-4 text-slate-300 dark:text-slate-600" />
          <h1 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
            {getBreadcrumbTitle()}
          </h1>
        </div>

        {/* Prominent Clinical Faculty Badge */}
        {facultyName && (
          <div
            title={facultyName}
            className="hidden lg:flex items-center gap-2 bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 px-3 py-1.5 rounded-xl font-semibold text-xs max-w-[240px] xl:max-w-[320px] truncate"
          >
            <Building2 className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="truncate">{facultyName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Interactive Global Academic Year Selector */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/30">
          <Calendar className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-slate-400 dark:text-slate-400 font-semibold text-[11px]">Year:</span>
          {yearsLoading && !selectedYear ? (
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Loader2 className="size-3 animate-spin text-blue-500" />
              Loading...
            </span>
          ) : years.length > 0 ? (
            <div className="relative flex items-center">
              <select
                value={selectedYearId || ''}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="appearance-none bg-transparent pr-5 text-slate-900 dark:text-white font-bold cursor-pointer focus:outline-none text-xs"
                title="Switch active academic session"
                aria-label="Active Academic Session"
              >
                {years.map((year) => (
                  <option
                    key={year.id}
                    value={year.id}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1"
                  >
                    {year.name || year.year_label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 size-3 text-slate-400 dark:text-slate-400" />
            </div>
          ) : (
            <span className="text-slate-400 text-xs">No years</span>
          )}
        </div>

        <ThemeToggle />

        {/* User Profile Menu with Outside Click Hook */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all focus:outline-none"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-sky-600 to-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20">
              FD
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Faculty Dean</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Dean Admin</span>
            </div>
          </button>

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                  FD
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Faculty Dean</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{facultyName || 'Medical Faculty'}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold w-fit border border-blue-200/60 dark:border-blue-900/50">
                    <GraduationCap className="size-3" />
                    Faculty Dean
                  </span>
                </div>
              </div>

              <div className="py-2 border-b border-slate-100 dark:border-slate-800">
                <Link
                  href="/dean/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="size-4 text-blue-500" />
                  <span>Profile Settings</span>
                </Link>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                >
                  {loggingOut ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
