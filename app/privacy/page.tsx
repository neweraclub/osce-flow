import Link from 'next/link'
import { SiteFooter } from '@/components/footer'
import { Activity, Lock, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy · NEW ERA ECOS',
  description: 'Privacy Policy for NEW ERA live ecos platform (NE-ECOS).',
}

export default function PrivacyPage() {
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
              <Lock className="size-3.5" /> Privacy & Data Protection
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Effective Date: January 1, 2026 · NEW ERA live ecos platform (NE-ECOS)
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">1. Types of Data Collected</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We collect information necessary to operate medical assessment workflows, including candidate identifiers (name, matricule, cohort), examiner scores, evaluation rubrics, session timestamps, and technical audit telemetry (IP addresses, browser signatures).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">2. User Rights (GDPR & CCPA Compliant)</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Under applicable privacy legislation (including GDPR and CCPA), users have the right to request access to their personal data, request correction of inaccurate records, request data portability, or request erasure of non-mandatory academic evaluation records.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">3. Data Retention</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Assessment records and candidate evaluation data are retained strictly according to institutional compliance policies and academic archiving regulations. Technical log telemetry is purged every 90 days.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">4. Third-Party Analytics</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We utilize privacy-preserving, anonymized telemetry services to monitor platform performance and error rates. No candidate medical data or evaluation responses are transmitted to third-party advertising services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">5. Contact Information for Privacy Concerns</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              If you have any questions regarding your data privacy or wish to exercise your data rights, please contact our Data Protection Officer at{' '}
              <a href="mailto:privacy@ne-ecos.com" className="text-blue-600 font-medium hover:underline">
                privacy@ne-ecos.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
