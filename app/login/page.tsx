'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Layers,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  School,
  Shield,
  Stethoscope,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { SiteFooter } from '@/components/footer'
import { AlertBanner, AlertType } from '@/components/ui/AlertBanner'
import { useToast } from '@/context/ToastContext'

interface ActiveSessionUser {
  id: string
  email: string
  role: string
  firstName?: string
  lastName?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { showError } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null)

  // Active Session State
  const [activeUser, setActiveUser] = useState<ActiveSessionUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // Clinical transition state
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('')

  // 1. Initial mount active session check
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()

        if (res.ok && data.authenticated && data.user) {
          setActiveUser(data.user)
          // Trigger immediate client-side redirection
          const target = getDashboardByRole(data.user.role)
          if (target && target !== '/login') {
            triggerTransition(data.user.role, formatName(data.user), target)
          }
        }
      } catch {
        // Silently allow login form if session check fails
      } finally {
        setCheckingSession(false)
      }
    }

    checkActiveSession()
  }, [])

  const formatName = (user: ActiveSessionUser) => {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
    if (user.firstName) return user.firstName
    return user.email
  }

  const getDashboardByRole = (role: string) => {
    switch (role) {
      case 'superadmin':
        return '/superadmin'
      case 'dean':
        return '/dean'
      case 'professor':
        return '/evaluator'
      default:
        return '/login'
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlert(null)

    if (!email.trim() || !password) {
      setAlert({ type: 'error', message: 'Please enter both institutional email and password.' })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success || !data.user) {
        setAlert({
          type: 'error',
          message: data.error || 'Invalid credentials or inactive institutional account.',
        })
        setLoading(false)
        return
      }

      // Extract name formatting
      const dbFirstName = data.user.firstName || data.user.first_name || ''
      const dbLastName = data.user.lastName || data.user.last_name || ''
      let formattedName = ''

      if (dbFirstName && dbLastName) {
        formattedName = `${dbFirstName} ${dbLastName}`
      } else if (dbFirstName) {
        formattedName = dbFirstName
      } else {
        formattedName = ''
      }

      const role = data.user.role || ''
      triggerTransition(role, formattedName, data.redirectUrl)
    } catch {
      setAlert({
        type: 'error',
        message: 'Unable to connect to authentication server. Please try again.',
      })
      setLoading(false)
    }
  }

  const triggerTransition = (role: string, name: string, customRedirect?: string) => {
    setUserRole(role)
    setUserName(name)
    setIsTransitioning(true)
    setLoading(false)

    // Strict role-based routing matrix
    let targetPath = customRedirect || getDashboardByRole(role)

    if (!targetPath || targetPath === '/login') {
      setIsTransitioning(false)
      showError('Your account lacks valid portal authorization permissions.')
      return
    }

    // Imperative navigation execution:
    try {
      router.replace(targetPath)
      router.refresh()
    } catch {
      // router error safety catch
    }

    // Hard fallback timer after 800ms
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        window.location.href = targetPath as string
      }
    }, 800)
  }

  const handleSwitchAccount = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore logout network errors
    }
    setActiveUser(null)
    setIsTransitioning(false)
    setEmail('')
    setPassword('')
  }

  const getTransitionMessage = () => {
    switch (userRole) {
      case 'superadmin':
        return {
          title: 'Welcome Back',
          subtitle: 'Opening Platform Command Center...',
          icon: Shield,
        }
      case 'dean':
        return {
          title: 'Welcome Back',
          subtitle: 'Opening Medical Faculty Workspace...',
          icon: School,
        }
      case 'professor':
        return {
          title: 'Welcome Back',
          subtitle: 'Accessing Clinical Evaluation Portal...',
          icon: Stethoscope,
        }
      default:
        return {
          title: 'Welcome Back',
          subtitle: 'Initializing Workspace...',
          icon: GraduationCap,
        }
    }
  }

  const transitionMeta = getTransitionMessage()
  const RoleIcon = transitionMeta.icon

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200 flex flex-col justify-between">
      {/* Public Header */}
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

      {/* Main Page Layout */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12">
          
          {/* Left Side: Framed Clinical Display Card */}
          <div className="flex items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3 shadow-xl backdrop-blur-md overflow-hidden">
              <img 
                src="/images/login.jpg" 
                alt="Medical Clinical Workspace" 
                className="w-full h-auto object-contain rounded-xl mix-blend-multiply dark:mix-blend-normal dark:invert dark:hue-rotate-180 dark:brightness-95 dark:contrast-125 transition-all duration-300"
              />
            </div>
          </div>

          {/* Right Side: Clean Login Form OR Dedicated Clinical Transition Card */}
          {checkingSession ? (
            <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 min-h-[420px]">
              <Loader2 className="size-8 animate-spin text-sky-500 mb-3" />
              <p className="text-xs text-slate-400 font-semibold">Verifying session security...</p>
            </div>
          ) : isTransitioning || activeUser ? (
            <div className="relative p-8 md:p-12 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl md:shadow-2xl md:shadow-slate-200/50 dark:md:shadow-none border border-slate-100 dark:border-slate-800 min-h-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Glowing background ambient gradient */}
              <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 via-blue-500/5 to-indigo-500/10 blur-2xl pointer-events-none" />

              {/* Animated Pulse Ring & Role Badge Icon */}
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute size-24 rounded-full bg-sky-500/20 dark:bg-sky-400/20 animate-ping" />
                <div className="relative size-20 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-sky-500/30">
                  <RoleIcon className="size-10 text-white animate-pulse" />
                </div>
              </div>

              {/* Personalization Titles */}
              <div className="space-y-2 relative z-10">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  You are currently signed in as
                </h2>
                <p className="text-base sm:text-lg font-bold text-sky-600 dark:text-sky-400">
                  {userName || (activeUser ? formatName(activeUser) : '')}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 pt-1">
                  Redirecting to your dashboard...
                </p>
              </div>

              {/* Clinical Progress Line Bar */}
              <div className="mt-6 w-56 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 rounded-full animate-pulse w-full transition-all duration-700" />
              </div>

              {/* Sign in with a different account action */}
              <button
                onClick={handleSwitchAccount}
                className="mt-8 relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <LogOut className="size-3.5" />
                <span>Sign in with a different account</span>
              </button>
            </div>
          ) : (
            <div className="p-8 md:p-12 flex flex-col justify-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl md:shadow-2xl md:shadow-slate-200/50 dark:md:shadow-none border border-slate-100 dark:border-slate-800">
              <div className="mb-6">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome!</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please enter your institutional credentials to continue.</p>
              </div>

              {/* Dynamic Alert Banner */}
              {alert && (
                <div className="mb-6">
                  <AlertBanner
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert(null)}
                  />
                </div>
              )}

              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Institutional Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input 
                      required
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@faculty.edu.dz" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Your Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input 
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••" 
                      className="w-full pl-11 pr-11 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:bg-slate-800" 
                    />
                    <span>Remember my password</span>
                  </label>
                  <a 
                    href="#forgot" 
                    onClick={(e) => {
                      e.preventDefault()
                      setAlert({
                        type: 'info',
                        message: 'Password reset link sent to your institutional email address.',
                      })
                    }}
                    className="font-medium text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm shadow-md shadow-sky-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
                Don't have an account?{' '}
                <Link href="/signup" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          )}

        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
