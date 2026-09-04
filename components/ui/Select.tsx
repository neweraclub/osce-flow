'use client'

import React, { useState, useRef, useEffect, useId } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  subLabel?: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: {
    text: string
    variant?: 'success' | 'warning' | 'neutral' | 'slate'
  }
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  searchable?: boolean
  error?: string
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  label,
  disabled = false,
  searchable = true,
  error,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const selectedOption = options.find((opt) => opt.value === value)

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
  )

  // Intelligent Direction Positioning: check space below trigger
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      if (spaceBelow < 260 && rect.top > 260) {
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

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
    if (isOpen) {
      setHighlightedIndex(0)
    }
  }, [isOpen, searchable])

  // Global Keyboard Handlers: Escape, ArrowUp, ArrowDown, Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (e.key === 'Escape') {
      e.stopPropagation()
      setIsOpen(false)
      return
    }

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        let next = prev + 1
        while (next < filteredOptions.length && filteredOptions[next]?.disabled) {
          next++
        }
        return next < filteredOptions.length ? next : prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        let next = prev - 1
        while (next >= 0 && filteredOptions[next]?.disabled) {
          next--
        }
        return next >= 0 ? next : prev
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filteredOptions[highlightedIndex]
      if (target && !target.disabled) {
        onChange(target.value)
        setIsOpen(false)
      }
    }
  }

  const handleSelectOption = (opt: SelectOption) => {
    if (opt.disabled) return
    onChange(opt.value)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className={`relative w-full ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className={`w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border ${
          error
            ? 'border-rose-500 ring-1 ring-rose-500'
            : isOpen
            ? 'border-sky-500 ring-2 ring-sky-500/20 dark:ring-sky-400/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        } rounded-xl text-xs text-left transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <selectedOption.icon className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.subLabel && (
                  <span className="text-[10px] text-slate-400 truncate">
                    {selectedOption.subLabel}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-500' : ''
          }`}
        />
      </button>

      {error && <p className="text-[11px] font-semibold text-rose-500 mt-1">{error}</p>}

      {/* Intelligent Dropdown Popover */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute left-0 right-0 z-50 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-md p-2 animate-in fade-in zoom-in-95 flex flex-col ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {/* Search Filter Box */}
          {searchable && (
            <div className="p-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter options..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {/* Options List with max-h-52 */}
          <div className="max-h-52 overflow-y-auto space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value
                const isHighlighted = idx === highlightedIndex
                const IconComponent = opt.icon

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/20'
                        : isSelected
                        ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                        : isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {IconComponent && (
                        <IconComponent className={`size-4 ${isSelected ? 'text-sky-500' : 'text-slate-400'}`} />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{opt.label}</span>
                        {opt.subLabel && (
                          <span className="text-[10px] text-slate-400 truncate">{opt.subLabel}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {opt.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            opt.badge.variant === 'success'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/50'
                              : opt.badge.variant === 'warning'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/50'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-slate-700'
                          }`}
                        >
                          {opt.badge.text}
                        </span>
                      )}
                      {isSelected && <Check className="size-4 text-sky-500" />}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">No options found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
