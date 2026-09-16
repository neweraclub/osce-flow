'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const content = (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[99999] bg-[#050B08]/90 backdrop-blur-md flex flex-col items-center justify-center cursor-wait pointer-events-auto select-none animate-in fade-in duration-200"
    >
      <div className="flex flex-col items-center text-center space-y-5 max-w-md px-6">
        {/* Brand Icon with Spinner Glow Ring */}
        <div className="relative flex items-center justify-center size-24">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-emerald-500/30 via-lime-500/20 to-teal-500/30 blur-2xl animate-pulse" />
          <div className="relative size-20 rounded-2xl bg-[#07130F] border border-emerald-500/40 shadow-2xl flex items-center justify-center">
            <Loader2 className="size-10 animate-spin text-lime-400" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Stethoscope className="size-4 text-emerald-400/50" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-300/80 max-w-sm leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Security Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A1A14] border border-emerald-500/30 text-[11px] font-semibold text-emerald-300 shadow-inner">
          <ShieldCheck className="size-4 text-lime-400" />
          <span>OSCE-Flow Enterprise Security • Session Terminated</span>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

