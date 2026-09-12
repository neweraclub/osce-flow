'use client'

import React, { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function EvaluatorDashboardRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const stationId = searchParams.get('station_id')
    if (stationId) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('last_examiner_station_id', stationId)
        sessionStorage.setItem('last_examiner_station_id', stationId)
        document.cookie = `examiner_station_id=${stationId}; path=/; max-age=86400; SameSite=Lax`
      }
      router.replace(`/examiner/workspace?station_id=${stationId}`)
    } else {
      router.replace('/examiner/workspace')
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="size-8 animate-spin text-amber-500" />
      <p className="text-sm font-semibold text-slate-500 animate-pulse">
        Redirecting to Examiner Workspace...
      </p>
    </div>
  )
}

export default function EvaluatorDashboardRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <EvaluatorDashboardRedirectContent />
    </Suspense>
  )
}
