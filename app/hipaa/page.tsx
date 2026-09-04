import Link from 'next/link'
import { SiteFooter } from '@/components/footer'
import { Activity, ShieldAlert, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'HIPAA Compliance · NEW ERA ECOS',
  description: 'HIPAA compliance policies and standards for NEW ERA live ecos platform (NE-ECOS).',
}

export default function HipaaPage() {
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
              <ShieldAlert className="size-3.5" /> Healthcare Standards
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              HIPAA Compliance Statement
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Effective Date: January 1, 2026 · NEW ERA live ecos platform (NE-ECOS)
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">1. Educational Safeguards & PHI Handling</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              NEW ERA live ecos platform (NE-ECOS) is designed for medical education and assessment. While clinical scenarios utilize simulated patients and standardized OSCE rubrics, NE-ECOS enforces strict technical and administrative safeguards equivalent to HIPAA security standards.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">2. Encryption in Transit & At Rest</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              All data transmitted across NE-ECOS endpoints is protected using TLS 1.3 encryption. Data stored within our databases is encrypted at rest using AES-256 standards, with strict role-based access control (RBAC).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">3. Business Associate Agreements (BAA)</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              For medical institutions requiring custom enterprise deployments handling clinical data, NEW ERA ECOS offers execution of Business Associate Agreements (BAAs) upon institutional request.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
