import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const stationId = searchParams.get('station_id')
    const examIdParam = searchParams.get('exam_id')

    if (!stationId) {
      return NextResponse.json(
        { success: false, error: 'station_id is required' },
        { status: 400 }
      )
    }

    // 1. Fetch station and module details
    const { data: station, error: stErr } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('id', stationId)
      .single()

    if (stErr || !station) {
      return NextResponse.json(
        { success: false, error: 'Station not found.' },
        { status: 404 }
      )
    }

    const { data: mod } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id')
      .eq('id', station.module_id)
      .single()

    const levelId = mod?.level_id

    // 2. Fetch exams for this station
    const { data: exams, error: exErr } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('station_id', stationId)
      .order('exam_date', { ascending: false })

    if (exErr) {
      console.error('Failed to fetch exams:', exErr)
    }

    const activeExam = examIdParam
      ? (exams || []).find((e) => e.id === examIdParam) || exams?.[0]
      : exams?.[0]

    // 3. If there is an active exam, fetch its questions
    let questions: any[] = []
    if (activeExam) {
      const { data: qData, error: qErr } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('exam_id', activeExam.id)
        .order('created_at', { ascending: true })

      if (!qErr && qData) {
        questions = qData
      }
    }

    // 4. Fetch sections & groups for this level
    let groups: any[] = []
    let groupIds: string[] = []
    const groupMap = new Map<string, any>()
    const sectionMap = new Map<string, any>()

    if (levelId) {
      const { data: sections } = await supabaseAdmin
        .from('sections')
        .select('id, section_name, level_id')
        .eq('level_id', levelId)

      ;(sections || []).forEach((s) => sectionMap.set(s.id, s))
      const sectionIds = (sections || []).map((s) => s.id)

      if (sectionIds.length > 0) {
        const { data: grps } = await supabaseAdmin
          .from('groups')
          .select('id, group_name, section_id')
          .in('section_id', sectionIds)

        groups = grps || []
        groups.forEach((g) => groupMap.set(g.id, g))
        groupIds = groups.map((g) => g.id)
      }
    }

    // 5. Fetch students in those groups (or all students if no group restriction)
    let studentsQuery = supabaseAdmin.from('students').select('*')
    if (groupIds.length > 0) {
      studentsQuery = studentsQuery.in('group_id', groupIds)
    }
    const { data: rawStudents, error: stuErr } = await studentsQuery.order('last_name', { ascending: true })

    if (stuErr) {
      console.error('Error fetching students:', stuErr)
    }

    const studentList = rawStudents || []

    // 6. Fetch existing exam_attempts for these students on the active exam
    const attemptMap = new Map<string, any>()
    if (activeExam && studentList.length > 0) {
      const studentIds = studentList.map((s) => s.id)
      const { data: attempts } = await supabaseAdmin
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', activeExam.id)
        .in('student_id', studentIds)

      ;(attempts || []).forEach((att) => {
        attemptMap.set(att.student_id, att)
      })
    }

    // 7. Format students with status and group info
    const formattedStudents = studentList.map((st) => {
      const grp = groupMap.get(st.group_id)
      const sec = grp ? sectionMap.get(grp.section_id) : null
      const attempt = attemptMap.get(st.id)

      // Derive status: 'completed' | 'absent' | 'pending'
      let status: 'pending' | 'present' | 'in_progress' | 'completed' | 'absent' = 'pending'
      let finalScore = null

      if (attempt) {
        finalScore = Number(attempt.final_score ?? 0)
        if (attempt.status === 'absent') {
          status = 'absent'
        } else if (attempt.status === 'passed' || attempt.status === 'failed') {
          // If score is 0 and status is marked as absent-compatible, or completed
          status = 'completed'
        } else {
          status = 'completed'
        }
      }

      return {
        id: st.id,
        matricule: st.matricule,
        first_name: st.first_name,
        last_name: st.last_name,
        full_name: `${st.last_name} ${st.first_name}`.trim(),
        group_id: st.group_id,
        group_name: grp ? `Group ${grp.group_name}` : 'Unassigned',
        section_name: sec ? `Section ${sec.section_name}` : 'General',
        attempt_id: attempt?.id || null,
        status: status,
        final_score: finalScore,
      }
    })

    return NextResponse.json({
      success: true,
      station: {
        id: station.id,
        station_number: station.station_number,
        title: station.title,
        module_id: station.module_id,
        module_name: mod?.module_name || 'Medical Module',
        level_id: levelId,
      },
      active_exam: activeExam || null,
      exams: exams || [],
      questions: questions || [],
      groups: groups || [],
      students: formattedStudents,
    })
  } catch (error: any) {
    console.error('evaluator/students error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch evaluator students.' },
      { status: 500 }
    )
  }
}
