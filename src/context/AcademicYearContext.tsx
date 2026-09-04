'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

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
        data = rawList.map((y: any, idx: number) => ({
          id: y.id,
          name: y.name || y.year_label || 'Academic Year',
          year_label: y.year_label || y.name || 'Academic Year',
          is_current: y.is_current ?? (y.is_active ?? idx === 0),
          faculty_id: y.faculty_id,
        }))
      } else {
        // Fallback to /api/dean/academic-years
        const fallbackRes = await fetch('/api/dean/academic-years')
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json()
          data = (fallbackJson.academicYears || []).map((y: any, idx: number) => ({
            id: y.id,
            name: y.year_label,
            year_label: y.year_label,
            is_current: idx === 0,
            faculty_id: y.faculty_id,
          }))
        }
      }

      setYears(data)

      const savedId = typeof window !== 'undefined' ? localStorage.getItem('selected_academic_year_id') : null
      const defaultYear =
        data.find((y) => y.id === savedId) ||
        data.find((y) => y.is_current) ||
        data[0]

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
