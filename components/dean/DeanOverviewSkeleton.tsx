'use client'

import React from 'react'

export function DeanOverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Hero Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          {/* Pill Badge */}
          <div className="h-6 w-44 bg-slate-200 dark:bg-slate-800 rounded-full" />
          {/* Title */}
          <div className="h-9 w-72 sm:w-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          {/* Subtitle */}
          <div className="h-4 w-60 sm:w-80 bg-slate-200/70 dark:bg-slate-800/70 rounded-lg" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="size-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-11 w-36 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* KPI Metrics 5-Column Responsive Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={`kpi-skel-${idx}`}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="size-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="space-y-1.5">
              <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-3 w-32 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-200/60 dark:bg-slate-800/60 rounded" />
              <div className="size-3.5 bg-slate-200/60 dark:bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Clinical OSCE Weighted Performance Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-1.5">
              <div className="h-5 w-64 sm:w-80 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-3 w-48 sm:w-96 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
            </div>
          </div>
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`osce-skel-${idx}`}
              className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="size-4 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-3 w-36 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Split Body Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Roadmap Skeleton */}
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="h-5 w-52 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-3 w-72 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`step-skel-${idx}`}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="size-9 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-56 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
                  </div>
                </div>
                <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Quick Directories Skeleton */}
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-3 w-60 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`dir-skel-${idx}`}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3"
              >
                <div className="size-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-16 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
