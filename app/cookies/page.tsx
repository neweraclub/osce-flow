import Link from 'next/link'
import { SiteFooter } from '@/components/footer'
import { Activity, Cookie, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Cookie Policy · NEW ERA ECOS',
  description: 'Cookie Policy for NEW ERA live ecos platform (NE-ECOS).',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Activity className="size-5" />
            </span>
            NEW ERA <span className="text-blue-600">ECOS</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="size-4" /> Back to Platform
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-4xl px-5 py-12 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 lg:p-12 shadow-sm space-y-8">
          <div className="border-b border-slate-200 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Cookie className="size-3.5" /> Cookie & Tracking Policy
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Cookie Policy
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Effective Date: January 1, 2026 · NEW ERA live ecos platform (NE-ECOS)
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">1. What Are Cookies?</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Cookies are small data files stored on your browser or device when you interact with web applications. They allow NEW ERA live ecos platform (NE-ECOS) to remember user sessions, security tokens, and user preferences across navigation events.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">2. Essential vs. Analytics Cookies</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-semibold text-slate-900 text-sm">Essential Cookies</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Strictly necessary for platform security, authentication tokens, session persistence during live OSCE station grading, and cookie consent preferences. These cannot be disabled.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-semibold text-slate-900 text-sm">Analytics & Telemetry Cookies</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Used to aggregate anonymous usage statistics, monitor system latency during examination sessions, and improve platform accessibility.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">3. Managing & Revoking Cookie Preferences</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              You can modify or revoke your cookie preferences at any time. When you visit NE-ECOS for the first time, our cookie consent banner allows you to select &ldquo;Essential Only&rdquo; or &ldquo;Accept All&rdquo;.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              You can also clear your cookie preferences directly by clearing your browser local storage key <code className="rounded bg-slate-100 px-1 font-mono text-xs">ne_ecos_cookie_consent</code> or via your browser settings.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
