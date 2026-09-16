'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar, Check, ChevronDown, Loader2 } from 'lucide-react'
import { useAcademicYear } from '@/context/AcademicYearContext'

export function NavbarYearSelector() {
  const {
    years,
    selectedYearId,
    selectedYear,
    setSelectedYearId,
    isLoading,
  } = useAcademicYear()

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Outside click and Escape / Cmd+Y listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const displayName =
    selectedYear?.name ||
    selectedYear?.year_label ||
    (isLoading ? 'Loading...' : 'Select Year')

  return (
    <div className="relative" ref={containerRef}>
      {/* Segmented Command Chip Trigger (32px height) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isLoading && years.length === 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Switch active academic year (⌘Y)"
        className={`hidden sm:inline-flex items-center h-8 rounded-lg text-xs font-semibold transition-all border shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer select-none overflow-hidden ${
          isOpen
            ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
            : 'bg-white dark:bg-[#0F121C] hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-200'
        }`}
      >
        {/* Left Segment: Icon + Active Status Dot */}
        <span className="flex items-center gap-1.5 px-2.5 h-full border-r border-slate-200/60 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
          <Calendar className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="relative flex size-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
          </span>
        </span>

        {/* Center Segment: Display Label */}
        <span className="px-2.5 flex items-center gap-1 min-w-0 font-mono tracking-tight font-bold">
          {isLoading && !selectedYear ? (
            <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
              <Loader2 className="size-3 animate-spin text-indigo-500" />
              Loading...
            </span>
          ) : (
            <span className="truncate max-w-[140px]">{displayName}</span>
          )}
        </span>

        {/* Right Segment: Shortcut Badge + Chevron */}
        <span className="flex items-center gap-1 px-2 h-full border-l border-slate-200/60 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] text-[10px] text-slate-400 font-mono">
          <kbd className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800/80 text-[9px] font-semibold">⌘Y</kbd>
          <ChevronDown
            className={`size-3 text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-indigo-500' : ''
            }`}
          />
        </span>
      </button>

      {/* Floating Dropdown Menu Panel */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Academic Years"
          className="absolute right-0 sm:left-0 sm:right-auto mt-2 min-w-[220px] max-w-[280px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
            <span>Academic Session</span>
            <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-900/40">
              Global
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {years.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                No academic years found.
              </div>
            ) : (
              years.map((year) => {
                const isSelected = year.id === selectedYearId
                const label = year.name || year.year_label

                return (
                  <button
                    key={year.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedYearId(year.id)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{label}</span>
                      {year.is_current && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                          Current
                        </span>
                      )}
                    </div>
                    {isSelected ? (
                      <Check className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    ) : (
                      <span className="size-3.5 shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
