import Link from 'next/link'
import { Activity } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-[#000B4F] px-5 py-14 text-[#F8FAFC] lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Activity className="size-5" />
            </span>
            NEW ERA <span className="text-blue-400">ECOS</span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-slate-300">
            NEW ERA live ecos platform — Empowering medical assessment, evaluation, and learning systems.
          </p>
          <p className="mt-8 text-xs text-slate-400">
            © 2026 NEW ERA live ecos platform. All rights reserved.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-blue-300">Resources</h3>
          <ul className="mt-5 flex flex-col gap-3">
            <li>
              <Link href="/docs" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                Documentation
              </Link>
            </li>
            <li>
              <Link href="/support" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                Support
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-blue-300">Company</h3>
          <ul className="mt-5 flex flex-col gap-3">
            <li>
              <Link href="/about" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                About NEW ERA ECOS
              </Link>
            </li>
            <li>
              <Link href="/careers" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                Careers
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                Contact our team
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-blue-300">Legal & Terms</h3>
          <ul className="mt-5 flex flex-col gap-3">
            <li>
              <Link href="/terms" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                Terms of service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                Cookie policy
              </Link>
            </li>
            <li>
              <Link href="/hipaa" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                HIPAA compliance
              </Link>
            </li>
            <li>
              <Link href="/security" className="text-sm text-slate-300 transition-colors hover:text-blue-400">
                Security
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
