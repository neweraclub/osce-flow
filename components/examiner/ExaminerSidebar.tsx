'use client'

import React from 'react'
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  PanelLeft,
  PanelLeftClose,
  ShieldCheck,
  X,
} from 'lucide-react'

export type ExaminerNavTab = 'station' | 'roster' | 'marksheets'

interface StationMeta {
  id: string
  station_number: number
  title: string
  module_id: string
  module_name: string
  level_id?: string
  level_name?: string
  academic_year_id?: string | null
  academic_year_label?: string
}

interface ExamMeta {
  id: string
  station_id: string
  session_type: string
  exam_date: string
  created_at?: string
}

interface ExaminerSidebarProps {
  station: StationMeta | null
  activeExam: ExamMeta | null
  completedCount: number
  pendingCount: number
  totalCount: number
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  activeTab: ExaminerNavTab
  setActiveTab: (tab: ExaminerNavTab) => void
  onLockStation: () => void
  collapsed?: boolean
  setCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void
}

export function ExaminerSidebar({
  station,
  activeExam,
  completedCount,
  pendingCount,
  totalCount,
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  onLockStation,
  collapsed = false,
  setCollapsed,
}: ExaminerSidebarProps) {
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const navItems = [
    {
      id: 'station' as const,
      label: 'Active Station',
      icon: BookOpen,
      badge: null,
    },
    {
      id: 'roster' as const,
      label: 'Roster & Candidates',
      icon: ClipboardCheck,
      badge: `${completedCount}/${totalCount}`,
    },
    {
      id: 'marksheets' as const,
      label: 'Completed Marksheets',
      icon: CheckCircle2,
      badge: `${completionPercentage}%`,
    },
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
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 ${
          collapsed ? 'md:w-[70px] w-64' : 'w-64'
        } bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-screen overflow-x-hidden`}
      >
        {/* Top Header & Station Context */}
        <div className="border-b border-slate-100 dark:border-slate-800/80">
          {!collapsed ? (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Brand Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20 shrink-0">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold tracking-tight text-slate-900 dark:text-white text-sm truncate">
                      NEW ERA <span className="text-amber-600 dark:text-amber-400">ECOS</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate">
                      Examiner Terminal
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {setCollapsed && (
                    <button
                      type="button"
                      onClick={() => setCollapsed((prev) => !prev)}
                      title="Collapse sidebar (Ctrl+B)"
                      className="hidden md:flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <PanelLeftClose className="size-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                    className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              {/* Bound Station Context Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Station {station?.station_number || 1}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <span
                  className="text-xs font-extrabold text-slate-900 dark:text-white truncate"
                  title={station?.title}
                >
                  {station?.title || 'Clinical Station'}
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                  {station?.module_name || 'Clinical Module'}
                </span>

                {/* Scope Badges */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {station?.academic_year_label && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/80 dark:bg-slate-800 border border-amber-500/20 text-slate-700 dark:text-slate-300 truncate">
                      {station.academic_year_label}
                    </span>
                  )}
                  {station?.level_name && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/80 dark:bg-slate-800 border border-amber-500/20 text-slate-700 dark:text-slate-300 truncate">
                      {station.level_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Mini-Widget */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span>Assessment Flow</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400">
                    {completionPercentage}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                  <div
                    style={{
                      width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                    }}
                    className="h-full bg-emerald-500 transition-all duration-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-center pt-0.5">
                  <div className="rounded-lg py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/40 dark:border-emerald-800/40">
                    <div className="font-bold font-mono text-xs">{completedCount}</div>
                    <div className="text-[9px] opacity-75">Completed</div>
                  </div>
                  <div className="rounded-lg py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200/40 dark:border-amber-800/40">
                    <div className="font-bold font-mono text-xs">{pendingCount}</div>
                    <div className="text-[9px] opacity-75">Pending</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 py-4 flex flex-col items-center gap-3">
              <div
                className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20 shrink-0"
                title="NEW ERA ECOS · Examiner Terminal"
              >
                <ShieldCheck className="size-5" />
              </div>
              {setCollapsed && (
                <button
                  type="button"
                  onClick={() => setCollapsed((prev) => !prev)}
                  title="Expand sidebar (Ctrl+B)"
                  className="hidden md:flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <PanelLeft className="size-4" />
                </button>
              )}

              {/* Collapsed Station Indicator */}
              <div
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 w-full"
                title={`Station #${station?.station_number || 1}: ${station?.title || 'Clinical Station'}`}
              >
                <span className="text-[10px] font-black">S{station?.station_number || 1}</span>
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse mt-0.5" />
              </div>

              {/* Collapsed Progress % */}
              <div
                className="flex flex-col items-center justify-center py-1 px-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 w-full text-center"
                title={`Progress: ${completedCount}/${totalCount} (${completionPercentage}%)`}
              >
                {completionPercentage}%
              </div>
            </div>
          )}
        </div>

        {/* Unified Navigation Items */}
        {!collapsed ? (
          <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id)
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`size-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        ) : (
          <nav className="flex-1 p-2 space-y-2 overflow-y-auto flex flex-col items-center">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id)
                    setSidebarOpen(false)
                  }}
                  title={`${item.label}${item.badge ? ` (${item.badge})` : ''}`}
                  className={`size-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.badge && (
                    <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-600 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>
              )
            })}
          </nav>
        )}

        {/* Footer Status & Lock Terminal */}
        {!collapsed ? (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            {/* Synced Status Indicator */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
              <span className="relative flex size-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                  Examiner Terminal Synced
                </span>
                <span className="text-[9px] text-slate-400 truncate">
                  {activeExam?.session_type
                    ? `${activeExam.session_type.toUpperCase()} Session`
                    : 'OSCE Clinical Session'}
                </span>
              </div>
            </div>

            {/* Lock Terminal */}
            <button
              type="button"
              onClick={onLockStation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer"
            >
              <Lock className="size-3.5" />
              <span>Lock Station</span>
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center gap-2.5">
            <span
              className="relative flex size-2.5"
              title={`Examiner Terminal Synced (${activeExam?.session_type || 'OSCE Session'})`}
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
            </span>
            <button
              type="button"
              onClick={onLockStation}
              title="Lock Station Terminal"
              className="size-9 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors cursor-pointer"
            >
              <Lock className="size-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
