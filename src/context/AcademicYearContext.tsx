'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'

export interface AcademicYear {
  id: string
  name: string // e.g., "2019–2020", "2024–2025"
  year_label?: string
  is_current?: boolean
  faculty_id?: string
}

export interface AcademicYearContextType {
  years: AcademicYear[]
  selectedYearId: string | null
  selectedYear: AcademicYear | null
  setSelectedYearId: (id: string) => void
  isLoading: boolean
  refreshYears: () => Promise<void>
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined)

export function AcademicYearProvider({ children }: { children: React.ReactNode }) {
  const [years, setYears] = useState<AcademicYear[]>([])
  const [selectedYearId, setSelectedYearIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadYears = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/academic-years')
      let data: AcademicYear[] = []
      if (res.ok) {
        const json = await res.json()
        const rawList = Array.isArray(json) ? json : json.academicYears || []
        data = rawList.map((y: any) => {
          const label = y.year_label || y.name || 'Academic Year'
          const isCurrent = typeof y.is_current === 'boolean'
            ? y.is_current
            : typeof y.is_active === 'boolean'
              ? y.is_active
              : isAcademicYearCurrent(label)

          return {
            id: y.id,
            name: label,
            year_label: label,
            is_current: isCurrent,
            faculty_id: y.faculty_id,
          }
        })
      } else {
        // Fallback to /api/dean/academic-years
        const fallbackRes = await fetch('/api/dean/academic-years')
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json()
          data = (fallbackJson.academicYears || []).map((y: any) => {
            const label = y.year_label || y.name || 'Academic Year'
            const isCurrent = typeof y.is_current === 'boolean'
              ? y.is_current
              : typeof y.is_active === 'boolean'
                ? y.is_active
                : isAcademicYearCurrent(label)

            return {
              id: y.id,
              name: label,
              year_label: label,
              is_current: isCurrent,
              faculty_id: y.faculty_id,
            }
          })
        }
      }

      const sortedData = sortAcademicYears(data)
      setYears(sortedData)

      const savedId = typeof window !== 'undefined' ? localStorage.getItem('selected_academic_year_id') : null
      const savedYear = sortedData.find((y) => y.id === savedId)
      const currentYear = sortedData.find((y) => y.is_current)
      const defaultYear = savedYear || currentYear || sortedData[0]

      if (defaultYear) {
        setSelectedYearIdState(defaultYear.id)
        if (typeof window !== 'undefined') {
          localStorage.setItem('selected_academic_year_id', defaultYear.id)
        }
      }
    } catch (err) {
      console.error('Failed to load academic years:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadYears()
  }, [loadYears])

  const setSelectedYearId = (id: string) => {
    setSelectedYearIdState(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_academic_year_id', id)
    }
  }

  const selectedYear = years.find((y) => y.id === selectedYearId) || null

  return (
    <AcademicYearContext.Provider
      value={{
        years,
        selectedYearId,
        selectedYear,
        setSelectedYearId,
        isLoading,
        refreshYears: loadYears,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  )
}

export function useAcademicYear() {
  const context = useContext(AcademicYearContext)
  if (!context) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider')
  }
  return context
}
