'use client'

import React from 'react'
import Link from 'next/link'
import { Activity, KeyRound, Layers, LogIn, Mail, UserPlus } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="focus:outline-none flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Activity className="size-5" />
          </span>
          NEW ERA <span className="text-blue-600 dark:text-blue-400">ECOS</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <Layers className="size-4" />
            Platform
          </Link>
          <Link
            href="/#contact"
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <Mail className="size-4" />
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/examiner"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <KeyRound className="size-4 text-amber-600 dark:text-amber-400" />
            <span>Access Station</span>
          </Link>
          <ThemeToggle />
          <Link
            href="/login"
            className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <LogIn className="size-4" />
            Sign in
          </Link>
        </div>
      </div>
    </header>
  )
}

export const Navbar = PublicHeader
