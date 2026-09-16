'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ClipboardCheck, Loader2 } from 'lucide-react'

export default function DeanExamsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dean/stations')
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mx-auto">
        <ClipboardCheck className="size-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <span>Redirecting to Clinical Stations...</span>
          <Loader2 className="size-4 animate-spin text-indigo-500" />
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Exam and station management has moved to the unified clinical stations hub.
        </p>
      </div>
      <Link
        href="/dean/stations"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
      >
        <span>Go to Stations</span>
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  )
}
