'use client'

import React from 'react'
import Link from 'next/link'
import { Stethoscope, KeyRound } from 'lucide-react'

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
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors group ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <KeyRound className="size-3.5" />
          </div>
          <span>Enter Examiner Portal</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
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
        className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 ${className}`}
      >
        <Stethoscope className="size-4" />
        <span>Launch Evaluator Station</span>
        <span className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[11px] font-bold tracking-wider">
          PIN
        </span>
      </Link>
    )
  }

  // Default 'topbar' or 'compact'
  return (
    <Link
      href="/evaluator"
      onClick={onClick}
      title="Enter Examiner Portal (PIN Lock-in)"
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 hover:shadow-sm active:scale-95 ${className}`}
    >
      <span className="relative flex size-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
      </span>
      <Stethoscope className="size-3.5 text-amber-600 dark:text-amber-400" />
      <span className="hidden sm:inline">Evaluator Mode</span>
    </Link>
  )
}
