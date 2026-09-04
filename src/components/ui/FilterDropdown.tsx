'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Filter, X } from 'lucide-react'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  value: string | string[]
  onChange: (value: any) => void
  multiple?: boolean
  placeholder?: string
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Compute selected count & labels
  const selectedValues = Array.isArray(value) ? value : value ? [value] : []
  const hasSelection = selectedValues.length > 0

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
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUpward(spaceBelow < 240)
    }
    setIsOpen(!isOpen)
  }

  const handleSelectOption = (optValue: string) => {
    if (multiple) {
      const current = Array.isArray(value) ? [...value] : []
      if (current.includes(optValue)) {
        onChange(current.filter((v) => v !== optValue))
      } else {
        onChange([...current, optValue])
      }
    } else {
      if (value === optValue) {
        onChange('')
      } else {
        onChange(optValue)
      }
      setIsOpen(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(multiple ? [] : '')
    setIsOpen(false)
  }

  // Display trigger label
  const defaultPlaceholder = placeholder || `All ${label}s`
  let triggerText = defaultPlaceholder
  if (multiple) {
    if (selectedValues.length === 1) {
      const found = options.find((o) => o.value === selectedValues[0])
      triggerText = found ? found.label : defaultPlaceholder
    } else if (selectedValues.length > 1) {
      triggerText = `${label} (${selectedValues.length})`
    }
  } else if (value && typeof value === 'string') {
    const found = options.find((o) => o.value === value)
    if (found) triggerText = found.label
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
          hasSelection
            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 shadow-sm'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <Filter className={`size-3.5 ${hasSelection ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
        <span className="truncate max-w-[130px] sm:max-w-[160px]">{triggerText}</span>
        {hasSelection && (
          <span
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-sky-200/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 transition-colors"
            title="Clear filter"
          >
            <X className="size-3" />
          </span>
        )}
        <ChevronDown className={`size-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 animate-in fade-in zoom-in-95 ${
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Filter by {label}
            </span>
            {hasSelection && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {!multiple && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  !hasSelection
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{defaultPlaceholder}</span>
                {!hasSelection && <Check className="size-3.5 text-sky-600 dark:text-sky-400" />}
              </button>
            )}

            {options.map((opt) => {
              const isSelected = selectedValues.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectOption(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="size-3.5 text-sky-600 dark:text-sky-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
