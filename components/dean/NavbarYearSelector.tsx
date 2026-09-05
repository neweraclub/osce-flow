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

  // Outside click and Escape key listener
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
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const displayName =
    selectedYear?.name ||
    selectedYear?.year_label ||
    (isLoading ? 'Loading...' : 'Select Year')

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Pill Badge */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isLoading && years.length === 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Switch active academic year"
        className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer select-none ${
          isOpen
            ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
            : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200'
        }`}
      >
        <Calendar className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="text-slate-400 dark:text-slate-400 font-semibold text-[11px]">Year:</span>
        {isLoading && !selectedYear ? (
          <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
            <Loader2 className="size-3 animate-spin text-blue-500" />
            Loading...
          </span>
        ) : (
          <span className="text-slate-900 dark:text-white font-bold tracking-tight">
            {displayName}
          </span>
        )}
        <ChevronDown
          className={`size-3 text-slate-400 dark:text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
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
            <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-900/40">
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
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
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
                      <Check className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
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
