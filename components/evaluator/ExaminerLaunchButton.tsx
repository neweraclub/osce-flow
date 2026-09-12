'use client'

import React from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

interface ExaminerLaunchButtonProps {
  variant?: 'topbar' | 'dropdown' | 'hero' | 'compact'
  onClick?: () => void
  className?: string
}

export function ExaminerLaunchButton({
  variant = 'topbar',
  onClick,
  className = '',
}: ExaminerLaunchButtonProps) {
  if (variant === 'dropdown') {
    return (
      <Link
        href="/evaluator"
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <ShieldCheck className="size-3.5" />
          </div>
          <span>Enter Examiner Portal</span>
        </div>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
          PIN
        </span>
      </Link>
    )
  }

  if (variant === 'hero') {
    return (
      <Link
        href="/evaluator"
        onClick={onClick}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm hover:shadow active:scale-95 ${className}`}
      >
        <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" />
        <span>Launch Evaluator Station</span>
      </Link>
    )
  }

  // Default 'topbar' or 'compact' (Standard navigation action button with rounded pill)
  return (
    <Link
      href="/evaluator"
      onClick={onClick}
      title="Enter Examiner Portal (PIN Lock-in)"
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm hover:shadow active:scale-95 ${className}`}
    >
      <ShieldCheck className="size-3.5 text-blue-600 dark:text-blue-400" />
      <span className="hidden sm:inline">Evaluator Mode</span>
    </Link>
  )
}
