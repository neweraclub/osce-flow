'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  Building2,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Shield,
  User,
  UserCheck,
  X,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useToast } from '@/context/ToastContext'
import { SignOutOverlay } from '@/components/ui/SignOutOverlay'

const navigationItems = [
  {
    name: 'Overview Analytics',
    href: '/superadmin',
    icon: LayoutDashboard,
  },
  {
    name: 'Medical Faculties',
    href: '/superadmin/faculties',
    icon: Building2,
  },
  {
    name: 'Provision Deans',
    href: '/superadmin/deans',
    icon: UserCheck,
  },
]

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { showSuccess } = useToast()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const getBreadcrumbTitle = () => {
    if (pathname === '/superadmin/faculties') return 'Medical Faculties'
    if (pathname === '/superadmin/deans') return 'Provision Deans'
    if (pathname === '/superadmin/profile') return 'Profile Settings'
    return 'Central Command'
  }

  const handleSignOut = async () => {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Proceed with client side clean up
    } finally {
      showSuccess('Signed out successfully.')
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <Link
              href="/superadmin"
              className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 dark:text-white"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white shadow-md shadow-purple-500/20">
                <Activity className="size-5" />
              </span>
              <span>
                NEW ERA <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-400">ECOS</span>
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Central System Scope Badge */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-purple-500/10 border border-purple-500/25 text-xs font-semibold text-indigo-950 dark:text-purple-200 shadow-xs">
              <Shield className="size-4 shrink-0 text-purple-500" />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-slate-900 dark:text-white text-[11px]">Central Command Hub</p>
                <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 truncate" title="Algerian Medical Faculties • Central Command">
                  Algerian Medical Faculties • Central Command
                </p>
              </div>
            </div>
          </div>

          {/* Nav Items List */}
          <nav className="p-4 space-y-1.5">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all relative ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-l-4 border-purple-400 pl-3'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer Status Pill */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/50 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span className="font-semibold text-indigo-900 dark:text-indigo-200">System Operational</span>
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-purple-500" />
            </span>
          </div>
        </div>
      </aside>

      {/* Main Shell Container */}
      <div className="flex-1 md:pl-72 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors"
            >
              <Menu className="size-5" />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-slate-400 dark:text-slate-500">Superadmin Hub</span>
              <ChevronRight className="size-3 text-slate-300 dark:text-slate-600" />
              <h1 className="text-slate-900 dark:text-white font-bold text-sm">
                {getBreadcrumbTitle()}
              </h1>
            </div>

            {/* Central Command Badge */}
            <div
              title="Algerian Medical Faculties • Central Command"
              className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-indigo-600/10 to-purple-500/10 text-indigo-950 dark:text-purple-200 border border-purple-500/25 px-3 py-1.5 rounded-xl font-semibold text-xs max-w-[280px] xl:max-w-[340px] truncate shadow-xs"
            >
              <Building2 className="size-4 text-purple-500 shrink-0" />
              <span className="truncate">Algerian Medical Faculties • Central Command</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            {/* User Profile Menu with Outside Click Hook */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all focus:outline-none"
              >
                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-bold text-sm shadow-md shadow-purple-500/20 border border-purple-400/30">
                  SA
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Administrator</span>
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">Superadmin</span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-bold text-sm shadow-md shadow-purple-500/20 border border-purple-400/30">
                      SA
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Administrator</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Central Command</p>
                      <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-purple-300 text-[10px] font-bold w-fit border border-purple-500/30">
                        <span className="size-1.5 rounded-full bg-purple-500" />
                        Superadmin
                      </span>
                    </div>
                  </div>

                  <div className="py-2 border-b border-slate-100 dark:border-slate-800">
                    <Link
                      href="/superadmin/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <User className="size-4 text-blue-500" />
                      <span>Profile Settings</span>
                    </Link>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSignOut}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                    >
                      {loggingOut ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <LogOut className="size-4" />
                      )}
                      <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Global Full-Page Sign-Out Overlay */}
      <SignOutOverlay
        isOpen={loggingOut}
        title="Signing out securely..."
        subtitle="Terminating Superadmin privileged session..."
      />
    </div>
  )
}
