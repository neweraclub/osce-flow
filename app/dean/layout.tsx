'use client'

import React, { useState } from 'react'
import { DeanSidebar } from '@/components/dean/DeanSidebar'
import { DeanTopbar } from '@/components/dean/DeanTopbar'
import { AcademicYearProvider } from '@/context/AcademicYearContext'

export default function DeanLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AcademicYearProvider>
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090A0F] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200 antialiased selection:bg-indigo-500/20 selection:text-indigo-600">
        {/* Dean Sidebar */}
        <DeanSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          <DeanTopbar setSidebarOpen={setSidebarOpen} />
          <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in slide-in-from-bottom-1 duration-150 ease-out">
            {children}
          </main>
        </div>
      </div>
    </AcademicYearProvider>
  )
}
