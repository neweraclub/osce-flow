'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('ne_ecos_cookie_consent')
    if (!consent) {
      setVisible(true)
    }
  }, [])

  const acceptAll = () => {
    localStorage.setItem('ne_ecos_cookie_consent', 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie Consent Banner"
      className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-[#000B4F]/95 backdrop-blur-md p-5 shadow-2xl text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-start gap-4 mb-4 sm:mb-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
            <Cookie className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
              Cookie & Privacy Policy Notice
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300 border border-blue-400/20">
                NEW ERA ECOS
              </span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              NEW ERA live ecos platform uses cookies to enhance user experience, ensure system security, and analyze platform traffic. By continuing, you agree to our platform terms and cookie policy.{' '}
              <Link
                href="/cookies"
                className="underline underline-offset-2 font-medium text-blue-300 hover:text-white transition-colors"
              >
                Learn more in our Cookie Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={acceptAll}
            className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
