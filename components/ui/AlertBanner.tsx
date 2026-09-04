'use client'

import React from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export type AlertType = 'success' | 'error' | 'info'

export interface AlertBannerProps {
  type: AlertType
  message: string
  onClose?: () => void
}

export function AlertBanner({ type, message, onClose }: AlertBannerProps) {
  if (!message) return null

  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300',
          icon: <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        }
      case 'error':
        return {
          container: 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300',
          icon: <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0" />,
        }
      case 'info':
      default:
        return {
          container: 'bg-sky-500/10 border-sky-500/20 text-sky-800 dark:text-sky-300',
          icon: <Info className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />,
        }
    }
  }

  const { container, icon } = getAlertStyles()

  return (
    <div
      className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border text-xs font-semibold backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-1 ${container}`}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <span className="leading-snug break-words">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Dismiss alert"
          className="p-0.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all shrink-0"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
