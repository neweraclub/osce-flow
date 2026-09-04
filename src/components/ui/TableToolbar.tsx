'use client'

import React from 'react'
import { CheckCircle2, Search, X } from 'lucide-react'

export interface TableToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  searchPlaceholder?: string
  filters?: React.ReactNode
  selectedIds?: string[]
  totalCount?: number
  onClearSelection?: () => void
  batchActions?: React.ReactNode
  rightActions?: React.ReactNode
}

export function TableToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters,
  selectedIds = [],
  totalCount,
  onClearSelection,
  batchActions,
  rightActions,
}: TableToolbarProps) {
  const selectedCount = selectedIds.length
  const hasSelection = selectedCount > 0

  return (
    <div className="space-y-3">
      {/* Main Bar: Search, Filters, and Optional Right Actions */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Search & Filter Slot */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Slot */}
          {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}
        </div>

        {/* Right Actions Slot (e.g. Add Button, Export) */}
        {rightActions && <div className="flex items-center gap-2.5 shrink-0">{rightActions}</div>}
      </div>

      {/* Floating / Inline Batch Action Bar */}
      {hasSelection && (
        <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800/60 backdrop-blur-md shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-500/20">
              <CheckCircle2 className="size-4" />
              <span>{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
              {totalCount ? <span className="text-[10px] opacity-80">of {totalCount}</span> : null}
            </div>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-xs font-semibold text-sky-700 dark:text-sky-300 hover:underline"
              >
                Deselect All
              </button>
            )}
          </div>

          {/* Batch Actions Slot */}
          {batchActions && <div className="flex items-center gap-2.5 flex-wrap">{batchActions}</div>}
        </div>
      )}
    </div>
  )
}
