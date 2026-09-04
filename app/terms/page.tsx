import Link from 'next/link'
import { SiteFooter } from '@/components/footer'
import { Activity, ShieldCheck, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service · NEW ERA ECOS',
  description: 'Terms of Service for NEW ERA live ecos platform (NE-ECOS).',
}

export default function TermsPage() {
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
              <ShieldCheck className="size-3.5" /> Legal & Governance
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Effective Date: January 1, 2026 · NEW ERA live ecos platform (NE-ECOS)
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">1. Account Registration</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Access to NEW ERA live ecos platform requires registered user credentials provided by your authorized institution or directly registered through our secure onboarding system. You agree to provide accurate, current, and complete information and maintain the security of your credentials.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">2. Acceptable Use</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Users must utilize NE-ECOS strictly for medical education, OSCE assessments, examination scoring, and related academic or clinical operations. Reverse engineering, unauthorized data harvesting, or interfering with system integrity is strictly prohibited.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">3. User Responsibilities</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Examiners, administrators, and students are responsible for maintaining the confidentiality of examination rubrics, candidate identities, and station records. Any security vulnerability or unauthorized access attempt must be reported immediately to security@ne-ecos.com.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">4. Platform Uptime & SLA</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              NEW ERA ECOS strives to maintain a 99.9% platform availability during scheduled assessment windows. Scheduled maintenance windows are communicated in advance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">5. Limitations of Liability</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              To the maximum extent permitted by applicable law, NEW ERA live ecos platform shall not be liable for indirect, incidental, or consequential damages resulting from platform downtime or user error during evaluation sessions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">6. Termination</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We reserve the right to suspend or terminate user accounts that violate these Terms of Service or compromise platform security.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
