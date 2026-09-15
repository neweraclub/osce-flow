'use client'

import React from 'react'
import { Loader2, ShieldCheck, Stethoscope } from 'lucide-react'

interface SignOutOverlayProps {
  isOpen: boolean
  title?: string
  subtitle?: string
}

export function SignOutOverlay({
  isOpen,
  title = 'Signing out securely...',
  subtitle = 'Clearing your encrypted clinical session data...',
}: SignOutOverlayProps) {
  if (!isOpen) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center cursor-wait pointer-events-auto select-none animate-in fade-in duration-200"
    >
      <div className="flex flex-col items-center text-center space-y-4 max-w-sm px-6">
        {/* Brand Icon with Spinner Glow Ring */}
        <div className="relative flex items-center justify-center size-20">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-sky-500/20 blur-xl animate-pulse" />
          <div className="relative size-16 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-emerald-400" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Security Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-semibold text-slate-400 shadow-inner">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          <span>OSCE-Flow Enterprise Security</span>
        </div>
      </div>
    </div>
  )
}
