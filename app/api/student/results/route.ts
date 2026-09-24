import { NextRequest, NextResponse } from 'next/server'
import { getStudentResultsDashboardDataAction } from '@/app/actions/studentResults'

/**
 * API Route: GET /api/student/results?student_id=UUID
 * Fetches certified student examination results including exam attempts, raw scores,
 * candidate_penalties, candidate_bonuses, and aggregated module contributions.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('student_id')

    if (!studentId || !studentId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student ID parameter is required.' },
        { status: 400 }
      )
    }

    const result = await getStudentResultsDashboardDataAction(studentId.trim())

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to retrieve student examination records.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (err: any) {
    console.error('Error in GET /api/student/results:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error retrieving student results.' },
      { status: 500 }
    )
  }
}
