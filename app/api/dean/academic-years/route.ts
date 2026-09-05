import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: years, error } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .eq('faculty_id', dean.facultyId)

    if (error) throw error

    const sorted = sortAcademicYears(years || [])

    // Determine active / current year dynamically
    const formattedYears = sorted.map((y) => {
      const isCurrent = typeof y.is_current === 'boolean' ? y.is_current : isAcademicYearCurrent(y.year_label)
      return {
        ...y,
        name: y.year_label,
        is_active: isCurrent,
        is_current: isCurrent,
      }
    })

    return NextResponse.json({ success: true, academicYears: formattedYears })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch academic years.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { year_label } = body

    if (!year_label || !/^\d{4}-\d{4}$/.test(year_label.trim())) {
      return NextResponse.json(
        { success: false, error: 'Academic year label must follow YYYY-YYYY format (e.g. 2025-2026).' },
        { status: 400 }
      )
    }

    const cleanLabel = year_label.trim()

    // Check for existing year label in faculty
    const { data: existing } = await supabaseAdmin
      .from('academic_years')
      .select('id')
      .eq('faculty_id', dean.facultyId)
      .eq('year_label', cleanLabel)
      .single()

    if (existing) {
      return NextResponse.json({ success: false, error: 'Academic year already exists for this faculty.' }, { status: 400 })
    }

    const { data: newYear, error } = await supabaseAdmin
      .from('academic_years')
      .insert([
        {
          year_label: cleanLabel,
          faculty_id: dean.facultyId,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, academicYear: newYear })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create academic year.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Academic year ID is required.' }, { status: 400 })
    }

    // Verify ownership
    const { data: year, error: checkErr } = await supabaseAdmin
      .from('academic_years')
      .select('id, year_label')
      .eq('id', id)
      .eq('faculty_id', dean.facultyId)
      .single()

    if (checkErr || !year) {
      return NextResponse.json({ success: false, error: 'Academic year not found or permission denied.' }, { status: 404 })
    }

    // Check if sections are associated
    const { count: sectionCount } = await supabaseAdmin
      .from('sections')
      .select('id', { count: 'exact' })
      .eq('academic_year_id', id)

    if (sectionCount && sectionCount > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot remove ${year.year_label} because it contains active academic sections.` },
        { status: 400 }
      )
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('academic_years')
      .delete()
      .eq('id', id)

    if (deleteErr) throw deleteErr

    return NextResponse.json({ success: true, message: 'Academic year removed.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to remove academic year.' }, { status: 500 })
  }
}
