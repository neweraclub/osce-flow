'use client'

import React from 'react'
import {
  CheckCircle2,
  Edit2,
  FileText,
  CalendarOff,
  Radio,
} from 'lucide-react'

export type StationStatusType =
  | 'draft'
  | 'in_progress'
  | 'incomplete'
  | 'needs_setup'
  | 'ready'
  | 'rubric_ready'
  | 'ready_for_exam'
  | 'live'
  | 'active'
  | 'unscheduled'

export interface StationStatusBadgeProps {
  status?: StationStatusType | string
  questionCount?: number
  examCount?: number
  hasLinkedExam?: boolean
  isLive?: boolean
  label?: string
  className?: string
  size?: 'xs' | 'sm' | 'md'
  showIcon?: boolean
}

/**
 * Standardized Station Status Badge
 * Handles status matrix:
 * - Draft: Gray badge (`bg-slate-100 text-slate-700`) -> "Draft"
 * - In Progress / Incomplete: Amber badge (`bg-amber-50 text-amber-700`) -> "Incomplete Rubric" (Pencil icon)
 * - Complete / Rubric Ready: Green badge (`bg-emerald-50 text-emerald-700`) -> "Rubric Ready" (Check icon)
 * - Ready for Exam: Green badge (`bg-emerald-50 text-emerald-700`) -> "Ready for Exam" (Check icon)
 * - Live/Active: Blue/Pulse badge (`bg-blue-50 text-blue-700`) -> "Live Session" (Pulsing dot)
 */
export function StationStatusBadge({
  status,
  questionCount,
  examCount,
  hasLinkedExam,
  isLive = false,
  label,
  className = '',
  size = 'sm',
  showIcon = true,
}: StationStatusBadgeProps) {
  // 1. Resolve normalized status
  let resolved: 'draft' | 'incomplete' | 'ready' | 'rubric_ready' | 'live' | 'unscheduled' = 'incomplete'

  if (isLive || status === 'live' || status === 'active') {
    resolved = 'live'
  } else if (status === 'draft') {
    resolved = 'draft'
  } else if (status === 'unscheduled') {
    resolved = 'unscheduled'
  } else if (status === 'rubric_ready') {
    resolved = 'rubric_ready'
  } else if (status === 'ready_for_exam') {
    resolved = 'ready'
  } else if (questionCount !== undefined) {
    if (questionCount > 0) {
      if (hasLinkedExam || (examCount !== undefined && examCount > 0)) {
        resolved = 'ready'
      } else {
        resolved = 'rubric_ready'
      }
    } else {
      resolved = 'incomplete'
    }
  } else if (status === 'ready') {
    if (hasLinkedExam || (examCount !== undefined && examCount > 0)) {
      resolved = 'ready'
    } else {
      resolved = 'rubric_ready'
    }
  } else if (status === 'incomplete' || status === 'in_progress' || status === 'needs_setup') {
    resolved = 'incomplete'
  }

  // 2. Resolve display text and styles
  let badgeLabel = label
  let styleClasses = ''
  let IconComponent: React.ElementType | null = null

  switch (resolved) {
    case 'draft':
      badgeLabel = badgeLabel || 'Draft'
      styleClasses =
        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
      IconComponent = FileText
      break

    case 'incomplete':
      badgeLabel = badgeLabel || 'Incomplete Rubric'
      styleClasses =
        'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800'
      IconComponent = Edit2
      break

    case 'rubric_ready':
      badgeLabel = badgeLabel || 'Rubric Ready'
      styleClasses =
        'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800'
      IconComponent = CheckCircle2
      break

    case 'ready':
      badgeLabel = badgeLabel || 'Ready for Exam'
      styleClasses =
        'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800'
      IconComponent = CheckCircle2
      break

    case 'live':
      badgeLabel = badgeLabel || 'Live Session'
      styleClasses =
        'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/50'
      IconComponent = null // Handled via animated pulse dot
      break

    case 'unscheduled':
      badgeLabel = badgeLabel || 'Unscheduled Station'
      styleClasses =
        'bg-amber-50/70 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800'
      IconComponent = CalendarOff
      break
  }

  // Size variations
  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[9px]'
      : size === 'md'
      ? 'px-3 py-1 text-xs'
      : 'px-2.5 py-1 text-[10px]'

  const iconSize = size === 'xs' ? 'size-2.5' : size === 'md' ? 'size-3.5' : 'size-3'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border shrink-0 transition-colors ${sizeClasses} ${styleClasses} ${className}`}
    >
      {showIcon && resolved === 'live' && (
        <span className="relative flex size-2 mr-0.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex size-2 rounded-full bg-blue-600"></span>
        </span>
      )}
      {showIcon && resolved !== 'live' && IconComponent && (
        <IconComponent className={`${iconSize} shrink-0`} />
      )}
      <span className="tracking-tight whitespace-nowrap">{badgeLabel}</span>
    </span>
  )
}

/**
 * Notice banner replacing the technical placeholder
 * "Station blueprint pending exam date allocation"
 * with an actionable, human-friendly message.
 */
export function UnscheduledStationNotice({
  helperText = 'Assign an exam session to activate.',
  className = '',
  compact = false,
}: {
  helperText?: string
  className?: string
  compact?: boolean
}) {
  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium ${className}`}
      >
        <CalendarOff className="size-3.5 text-amber-500 shrink-0" />
        <span className="font-bold">Unscheduled Station</span>
        <span className="text-slate-400">•</span>
        <span className="text-slate-500 dark:text-slate-400">{helperText}</span>
      </div>
    )
  }

  return (
    <div
      className={`mt-2 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2.5 text-xs ${className}`}
    >
      <div className="size-7 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
        <CalendarOff className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-amber-900 dark:text-amber-200">
            Unscheduled Station
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
            Exam Date Not Set
          </span>
        </div>
        <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-1 font-medium leading-relaxed">
          {helperText}
        </p>
      </div>
    </div>
  )
}
