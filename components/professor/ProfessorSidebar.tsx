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
  LayoutDashboard,
  LogOut,
  Stethoscope,
  X,
} from 'lucide-react'

export function ProfessorSidebar({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}) {
  const pathname = usePathname()
  const [facultyName, setFacultyName] = useState<string>('Medical Faculty')
  const [professorName, setProfessorName] = useState<string>('Professor')

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user) {
            if (data.user.facultyName) setFacultyName(data.user.facultyName)
            if (data.user.firstName || data.user.lastName) {
              setProfessorName(`Prof. ${data.user.firstName || ''} ${data.user.lastName || ''}`.trim())
            }
          }
        }
      } catch {
        // Fallback
      }
    }
    loadSession()
  }, [])

  const navItems = [
    { label: 'Overview Dashboard', href: '/professor/dashboard', icon: LayoutDashboard },
    { label: 'My Clinical Modules', href: '/professor/modules', icon: BookOpen },
    { label: 'Station Blueprints & Rubrics', href: '/professor/stations', icon: ClipboardCheck },
    { label: 'Live OSCE Evaluator', href: '/evaluator', icon: Stethoscope },
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
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-screen`}
      >
        {/* Brand & Faculty Context Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <Link href="/professor/dashboard" className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 shrink-0">
                <Stethoscope className="size-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base truncate">
                  NEW ERA <span className="text-emerald-600 dark:text-emerald-400">ECOS</span>
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

          {/* Bound Faculty Banner */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
            <Building2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">
                Faculty Workspace
              </span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate" title={facultyName}>
                {facultyName}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`size-5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Professor Status Indicator */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
            <span className="relative flex size-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                {professorName}
              </span>
              <span className="text-[10px] text-slate-400 truncate">Examiner & Invigilator</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
