'use client'

import React from 'react'
import Link from 'next/link'
import { Activity, Layers, LogIn, Mail, UserPlus } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { ExaminerLaunchButton } from '@/components/examiner/ExaminerLaunchButton'

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
        <div className="flex items-center gap-3">
          <ExaminerLaunchButton variant="topbar" />
          <ThemeToggle />
          <Link
            href="/login"
            className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <LogIn className="size-4" />
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md hover:shadow-blue-500/25 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <UserPlus className="size-4" />
            Sign up
          </Link>
        </div>
      </div>
    </header>
  )
}

export const Navbar = PublicHeader
