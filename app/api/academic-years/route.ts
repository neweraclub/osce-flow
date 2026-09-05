import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken, supabaseAdmin } from '@/lib/auth'

import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'

export interface AcademicYearDto {
  id: string
  name: string
  year_label: string
  is_current: boolean
  faculty_id: string
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ecos_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const payload = verifyAuthToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid authentication session.' }, { status: 401 })
    }

    let query = supabaseAdmin
      .from('academic_years')
      .select('*')

    if (payload.role !== 'superadmin' && payload.faculty_id) {
      query = query.eq('faculty_id', payload.faculty_id)
    }

    const { data: years, error } = await query

    if (error) {
      throw error
    }

    const sorted = sortAcademicYears(years || [])

    const formattedYears: AcademicYearDto[] = sorted.map((y) => ({
      id: y.id,
      name: y.year_label,
      year_label: y.year_label,
      is_current: typeof y.is_current === 'boolean' ? y.is_current : isAcademicYearCurrent(y.year_label),
      faculty_id: y.faculty_id,
    }))

    return NextResponse.json(formattedYears)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch academic years.' }, { status: 500 })
  }
}
