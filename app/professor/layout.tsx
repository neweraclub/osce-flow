'use client'

import React, { useState } from 'react'
import { ProfessorSidebar } from '@/components/professor/ProfessorSidebar'
import { ProfessorTopbar } from '@/components/professor/ProfessorTopbar'
import { ToastProvider } from '@/context/ToastContext'
import { AcademicYearProvider } from '@/context/AcademicYearContext'

export default function ProfessorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ToastProvider>
      <AcademicYearProvider>
        <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#060D0A] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
          <ProfessorSidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <ProfessorTopbar setSidebarOpen={setSidebarOpen} />
            <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-1 duration-150 ease-out">
              {children}
            </main>
          </div>
        </div>
      </AcademicYearProvider>
    </ToastProvider>
  )
}
