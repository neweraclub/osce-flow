'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface DatePickerProps {
  value?: string // format: YYYY-MM-DD
  onChange: (date: string) => void
  label?: string
  placeholder?: string
  disablePastDates?: boolean
  disabled?: boolean
  error?: string
  className?: string
  format?: 'MMM DD, YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  variant?: 'emerald' | 'sky' | 'blue' | 'indigo'
  required?: boolean
}

/**
 * Format YYYY-MM-DD string into formatted display text (e.g., "Oct 24, 2026")
 */
function formatDisplayDate(
  dateStr?: string,
  format: 'MMM DD, YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'MMM DD, YYYY'
): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr

  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr

  if (format === 'MM/DD/YYYY') {
    return `${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
  }
  if (format === 'YYYY-MM-DD') {
    return dateStr
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[month]} ${String(day).padStart(2, '0')}, ${year}`
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select examination date...',
  disablePastDates = true,
  disabled = false,
  error,
  className = '',
  format = 'MMM DD, YYYY',
  variant = 'emerald',
  required = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize view year & month from current value or today
  const parsedDate = value ? new Date(value) : new Date()
  const initialYear = !isNaN(parsedDate.getFullYear()) ? parsedDate.getFullYear() : new Date().getFullYear()
  const initialMonth = !isNaN(parsedDate.getMonth()) ? parsedDate.getMonth() : new Date().getMonth()

  const [viewYear, setViewYear] = useState<number>(initialYear)
  const [viewMonth, setViewMonth] = useState<number>(initialMonth)

  // Update view when external value changes
  useEffect(() => {
    if (value) {
      const parts = value.split('-')
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10) - 1
        if (!isNaN(y) && !isNaN(m)) {
          setViewYear(y)
          setViewMonth(m)
        }
      }
    }
  }, [value])

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  // Auto-detect space below to drop up if cramped
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      if (spaceBelow < 320 && rect.top > 320) {
        setDropUp(true)
      } else {
        setDropUp(false)
      }
    }
  }, [isOpen])

  // Outside click listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard Escape listener
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      setIsOpen(false)
    }
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // Days in month & first day index
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day)
    selectedDate.setHours(0, 0, 0, 0)
    if (disablePastDates && selectedDate < today) return

    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(formatted)
    setIsOpen(false)
  }

  // Active theme classes based on variant
  const activeClasses =
    variant === 'indigo'
      ? {
          focusRing: 'focus:ring-2 focus:ring-indigo-500/20 border-indigo-500',
          selectedDay: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700',
          iconColor: 'text-indigo-600 dark:text-indigo-400',
          todayBadge: 'border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold',
        }
      : variant === 'emerald'
      ? {
          focusRing: 'focus:ring-2 focus:ring-emerald-500/20 border-emerald-500',
          selectedDay: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-700',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          todayBadge: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold',
        }
      : {
          focusRing: 'focus:ring-2 focus:ring-sky-500/20 border-sky-500',
          selectedDay: 'bg-sky-600 text-white shadow-md shadow-sky-500/25 hover:bg-sky-700',
          iconColor: 'text-sky-600 dark:text-sky-400',
          todayBadge: 'border-sky-500/40 text-sky-600 dark:text-sky-400 font-bold',
        }

  const displayDate = formatDisplayDate(value, format)

  return (
    <div className={`relative w-full ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          {label}{' '}
          {required && (
            <span
              className={
                variant === 'indigo'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }
            >
              *
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border ${
          error
            ? 'border-rose-500 ring-1 ring-rose-500'
            : isOpen
            ? activeClasses.focusRing
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        } rounded-xl text-xs text-left transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <CalendarIcon className={`size-4 ${activeClasses.iconColor} shrink-0`} />
          <span
            className={`font-semibold truncate ${
              value
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {value ? displayDate : placeholder}
          </span>
        </div>

        {value && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
            title="Clear date"
            aria-label="Clear selected date"
          >
            <X className="size-3.5" />
          </span>
        )}
      </button>

      {error && <p className="text-[11px] font-semibold text-rose-500 mt-1">{error}</p>}

      {/* Calendar Popover Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Calendar date picker"
          className={`absolute left-0 z-50 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 animate-in fade-in zoom-in-95 ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-1.5'
          }`}
        >
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {months[viewMonth]}
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {viewYear}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
            {daysOfWeek.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 text-center gap-1 text-xs">
            {/* Blank padding cells before month start */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="size-8" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateObj = new Date(viewYear, viewMonth, day)
              dateObj.setHours(0, 0, 0, 0)
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = value === dateStr
              const isPast = disablePastDates && dateObj < today
              const isToday = dateObj.getTime() === today.getTime()

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  className={`size-8 rounded-xl font-semibold flex items-center justify-center transition-all ${
                    isSelected
                      ? activeClasses.selectedDay
                      : isPast
                      ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600'
                      : isToday
                      ? `border ${activeClasses.todayBadge} hover:bg-slate-100 dark:hover:bg-slate-800`
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={
                    isPast
                      ? 'Historical date (disabled)'
                      : isToday
                      ? 'Today'
                      : undefined
                  }
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer Today Shortcut */}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400">
              {disablePastDates ? 'Upcoming dates only' : 'All dates enabled'}
            </span>
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                onChange(formatted)
                setViewYear(now.getFullYear())
                setViewMonth(now.getMonth())
                setIsOpen(false)
              }}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
