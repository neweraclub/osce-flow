import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { verifyModuleBelongsToFaculty } from '@/lib/facultyScope'

/**
 * GET /api/dean/modules/[id]/sessions
 * 
 * Securely looks up exam sessions for a specific module:
 * 1. Verifies module belongs to current Dean's faculty
 * 2. Uses supabaseAdmin to bypass RLS policies
 * 3. Handles case-insensitive session type matching ('REGULAR', 'regular', 'retake', 'RETAKE', etc.)
 * 4. Joins stations and computes configuration metrics
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { id: moduleId } = await params
    if (!moduleId) {
      return NextResponse.json({ success: false, error: 'Module ID is required.' }, { status: 400 })
    }

    // 1. Verify foreign key scope (module belongs to Dean's faculty)
    const isModuleAllowed = await verifyModuleBelongsToFaculty(moduleId, dean.facultyId)
    if (!isModuleAllowed) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Module does not belong to your faculty.' },
        { status: 403 }
      )
    }

    // 2. Fetch module info
    const { data: moduleData } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id, created_at')
      .eq('id', moduleId)
      .maybeSingle()

    // 3. Query exams table by module_id (with fallback to exam_sessions if aliased in environment)
    const { searchParams } = new URL(req.url)
    const sessionTypeFilter = searchParams.get('session_type')?.trim().toLowerCase()

    let { data: rawSessions, error } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('module_id', moduleId)
      .order('exam_date', { ascending: false })

    // Fallback if environment table is named exam_sessions
    if (error && (error.message?.includes('does not exist') || (error as any).code === '42P01')) {
      const fallback = await supabaseAdmin
        .from('exam_sessions')
        .select('*')
        .eq('module_id', moduleId)
        .order('exam_date', { ascending: false })
      rawSessions = fallback.data
      error = fallback.error
    }

    if (error) {
      throw error
    }

    // 4. Fetch associated stations for these sessions
    const examIds = (rawSessions || []).map((s) => s.id)
    let stationsList: any[] = []

    if (examIds.length > 0) {
      const { data: rawStations, error: stationsErr } = await supabaseAdmin
        .from('stations')
        .select('*')
        .in('exam_id', examIds)
        .order('station_number', { ascending: true })

      if (stationsErr) throw stationsErr
      stationsList = rawStations || []
    }

    const stationsByExam = new Map<string, any[]>()
    stationsList.forEach((st) => {
      const list = stationsByExam.get(st.exam_id) || []
      list.push(st)
      stationsByExam.set(st.exam_id, list)
    })

    // 5. Flexibly normalize session types (handling 'REGULAR', 'regular', 'retake', 'RETAKE', 'makeup')
    const normalizedSessions = (rawSessions || [])
      .map((s) => {
        const rawType = String(s.session_type || 'regular').trim().toLowerCase()
        const normType: 'regular' | 'retake' =
          rawType === 'retake' || rawType === 'makeup' ? 'retake' : 'regular'
        const stations = stationsByExam.get(s.id) || []
        const totalWeightage =
          Math.round(
            stations.reduce(
              (sum: number, st: any) => sum + Number(st.weightage_percentage || 0),
              0
            ) * 100
          ) / 100

        return {
          id: s.id,
          module_id: s.module_id,
          session_type: normType,
          raw_session_type: s.session_type,
          exam_date: s.exam_date,
          created_at: s.created_at,
          station_count: stations.length,
          total_weightage: totalWeightage,
          stations,
        }
      })
      .filter((s) => {
        if (!sessionTypeFilter) return true
        const target =
          sessionTypeFilter === 'retake' || sessionTypeFilter === 'makeup'
            ? 'retake'
            : 'regular'
        return s.session_type === target
      })

    const regularSession =
      normalizedSessions.find((s) => s.session_type === 'regular') || null
    const retakeSession =
      normalizedSessions.find((s) => s.session_type === 'retake') || null

    return NextResponse.json({
      success: true,
      module: moduleData,
      sessions: normalizedSessions,
      exams: normalizedSessions,
      regular_session: regularSession,
      retake_session: retakeSession,
      has_regular: Boolean(regularSession),
      has_retake: Boolean(retakeSession),
      total_sessions: normalizedSessions.length,
    })
  } catch (error: any) {
    console.error('Error in /api/dean/modules/[id]/sessions:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch module exam sessions.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dean/modules/[id]/sessions
 * Create a new exam session for this module
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { id: moduleId } = await params
    if (!moduleId) {
      return NextResponse.json({ success: false, error: 'Module ID is required.' }, { status: 400 })
    }

    const isModuleAllowed = await verifyModuleBelongsToFaculty(moduleId, dean.facultyId)
    if (!isModuleAllowed) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Module does not belong to your faculty.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { session_type, exam_date } = body

    const rawInputType = String(session_type || 'regular').trim().toLowerCase()
    const sessionTypeEnum: 'regular' | 'retake' =
      rawInputType === 'retake' || rawInputType === 'makeup' ? 'retake' : 'regular'
    const examDateVal = exam_date || new Date().toISOString().split('T')[0]

    // Check existing session case-insensitively
    const { data: existingSessions } = await supabaseAdmin
      .from('exams')
      .select('id, session_type')
      .eq('module_id', moduleId)

    const existingSession = (existingSessions || []).find((s) => {
      const t = String(s.session_type || 'regular').trim().toLowerCase()
      const norm = t === 'retake' || t === 'makeup' ? 'retake' : 'regular'
      return norm === sessionTypeEnum
    })

    if (existingSession) {
      const typeLabel = sessionTypeEnum === 'retake' ? 'Retake' : 'Regular'
      return NextResponse.json(
        {
          success: false,
          error: `A ${typeLabel} Session already exists for this module (maximum 1 Regular and 1 Retake session allowed).`,
        },
        { status: 400 }
      )
    }

    const { data: newSession, error } = await supabaseAdmin
      .from('exams')
      .insert([
        {
          module_id: moduleId,
          session_type: sessionTypeEnum,
          exam_date: examDateVal,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      session: {
        ...newSession,
        session_type: sessionTypeEnum,
      },
      message: `${sessionTypeEnum === 'retake' ? 'Retake' : 'Regular'} session created successfully.`,
    })
  } catch (error: any) {
    console.error('Error creating module session:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create exam session.' },
      { status: 500 }
    )
  }
}
