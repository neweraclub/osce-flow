'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function EvaluatorRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/examiner')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="size-8 animate-spin text-amber-500" />
      <p className="text-sm font-semibold text-slate-500 animate-pulse">
        Redirecting to Examiner Portal...
      </p>
    </div>
  )
}
