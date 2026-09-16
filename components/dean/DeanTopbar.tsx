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
import { NavbarYearSelector } from '@/components/dean/NavbarYearSelector'
import { ExaminerLaunchButton } from '@/components/examiner/ExaminerLaunchButton'
import { SignOutOverlay } from '@/components/ui/SignOutOverlay'

export function DeanTopbar({
  setSidebarOpen,
}: {
  setSidebarOpen: (open: boolean) => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { showSuccess } = useToast()

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
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-[#0F121C]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08] px-5 sm:px-8 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          className="md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg"
        >
          <Menu className="size-5" />
        </button>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
          <span className="text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">Faculty Administration</span>
          <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-600 hidden sm:inline" />
          <h1 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight truncate">
            {getBreadcrumbTitle()}
          </h1>
        </div>

        {/* Prominent Clinical Faculty Badge (32px height container) */}
        {facultyName && (
          <div
            title={facultyName}
            className="hidden lg:flex items-center gap-2 h-8 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200/70 dark:border-indigo-900/40 px-3 rounded-lg font-semibold text-xs max-w-[240px] xl:max-w-[320px] truncate shadow-2xs"
          >
            <Building2 className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate text-[11px]">{facultyName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Custom Accessible Academic Year Selector */}
        <NavbarYearSelector />

        {/* Theme Toggle in 32px height container */}
        <div className="h-8 flex items-center">
          <ThemeToggle />
        </div>

        {/* User Profile Menu with Outside Click Hook */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={loggingOut}
            className="h-8 flex items-center gap-2 px-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border border-transparent hover:border-slate-200/80 dark:hover:border-white/[0.08] transition-all focus:outline-none disabled:pointer-events-none cursor-pointer select-none"
          >
            <div className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs">
              FD
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">Faculty Dean</span>
              <span className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 leading-tight">Dean Admin</span>
            </div>
          </button>

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-slate-100 dark:border-white/[0.06] flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-500/25">
                  FD
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Faculty Dean</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{facultyName || 'Medical Faculty'}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold w-fit border border-indigo-500/20">
                    <span className="size-1.5 rounded-full bg-indigo-500" />
                    Faculty Dean
                  </span>
                </div>
              </div>

              {/* Enter Examiner Portal Action */}
              <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                <ExaminerLaunchButton variant="dropdown" onClick={() => setDropdownOpen(false)} />
              </div>

              <div className="py-2 border-b border-slate-100 dark:border-slate-800">
                <Link
                  href="/dean/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="size-4 text-indigo-500" />
                  <span>Profile Settings</span>
                </Link>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loggingOut ? (
                    <Loader2 className="size-4 animate-spin text-rose-600 shrink-0" />
                  ) : (
                    <LogOut className="size-4 shrink-0" />
                  )}
                  <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Full-Page Sign-Out Overlay */}
      <SignOutOverlay
        isOpen={loggingOut}
        title="Signing out securely..."
        subtitle="Clearing your Dean administrative session..."
      />
    </header>
  )
}
