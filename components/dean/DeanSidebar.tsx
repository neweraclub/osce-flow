'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'

export function DeanSidebar({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}) {
  const pathname = usePathname()
  const [facultyName, setFacultyName] = useState<string>('Medical Faculty')

  useEffect(() => {
    async function loadFacultyName() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user?.facultyName) {
            setFacultyName(data.user.facultyName)
            return
          }
        }

        // Fallback to dean overview endpoint
        const resOverview = await fetch('/api/dean/overview')
        if (resOverview.ok) {
          const dataOverview = await resOverview.json()
          if (dataOverview.success && dataOverview.faculty?.name) {
            setFacultyName(dataOverview.faculty.name)
          }
        }
      } catch {
        // Fallback
      }
    }
    loadFacultyName()
  }, [])

  const navItems = [
    { label: 'Overview', href: '/dean', icon: LayoutDashboard },
    { label: 'Academic Years', href: '/dean/academic-years', icon: Calendar },
    { label: 'Academic Structure', href: '/dean/structure', icon: Layers },
    { label: 'Clinical Modules', href: '/dean/modules', icon: BookOpen },
    { label: 'Stations', href: '/dean/stations', icon: ClipboardCheck },
    { label: 'Professors', href: '/dean/professors', icon: Stethoscope },
    { label: 'Students', href: '/dean/students', icon: Users },
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-[#0F121C]/80 backdrop-blur-md border-r border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-screen`}
      >
        {/* Brand & Faculty Context Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <Link href="/dean" className="flex items-center gap-2.5 group">
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="size-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold tracking-tight text-slate-900 dark:text-white text-sm truncate">
                  NEW ERA <span className="text-indigo-600 dark:text-indigo-400">ECOS</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Dean Portal</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Bound Faculty Banner */}
          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-200 flex items-center gap-2.5">
            <Building2 className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Medical Faculty
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={facultyName}>
                {facultyName}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items (Inset Pill Styling with Glowing Accent Indicator) */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dean' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                )}
                <Icon
                  className={`size-4 transition-colors shrink-0 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Dedicated Footer Module: Pinned Examiner Dock & Hub Status */}
        <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.08] space-y-2 bg-slate-50/50 dark:bg-black/20">
          {/* Pinned Examiner Mode Toggle Dock */}
          <Link
            href="/examiner"
            onClick={() => setSidebarOpen(false)}
            className="group relative flex items-center justify-between p-3 rounded-xl bg-linear-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 hover:border-amber-500/40 text-amber-900 dark:text-amber-200 transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="size-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">Examiner Mode</span>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80">Launch Scoring Hub</span>
              </div>
            </div>
            <span className="relative flex size-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-amber-500" />
            </span>
          </Link>

          {/* Operational Hub Status Indicator */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/40 dark:border-indigo-900/30">
            <span className="relative flex size-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                Faculty Hub Operational
              </span>
              <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 truncate font-mono">
                Real-Time Synchronized
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
