'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
  showToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastItem = { id, type, message }

      setToasts((prev) => [...prev, newToast])

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast]
  )

  const showSuccess = useCallback((message: string) => showToast('success', message), [showToast])
  const showError = useCallback((message: string) => showToast('error', message), [showToast])
  const showInfo = useCallback((message: string) => showToast('info', message), [showToast])

  // Support global Escape key dismissal of all active toasts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toasts.length > 0) {
        setToasts([])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toasts])

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showToast, removeToast }}>
      {children}

      {/* Floating Viewport Toast Container */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-[calc(100vw-2.5rem)] pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border shadow-2xl transition-all animate-in slide-in-from-top-4 fade-in duration-200 ${
              toast.type === 'success'
                ? 'border-emerald-200/80 dark:border-emerald-900/60 text-slate-900 dark:text-white'
                : toast.type === 'error'
                ? 'border-rose-200/80 dark:border-rose-900/60 text-slate-900 dark:text-white'
                : 'border-sky-200/80 dark:border-sky-900/60 text-slate-900 dark:text-white'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && (
                  <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="size-5" />
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className="size-8 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertCircle className="size-5" />
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="size-8 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <Info className="size-5" />
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Attention Required' : 'Information'}
                </span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                  {toast.message}
                </span>
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors shrink-0"
              aria-label="Dismiss message"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
