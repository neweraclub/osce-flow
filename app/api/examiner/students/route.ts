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

    // 1. Fetch station details
    const { data: station, error: stErr } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('id', stationId)
      .single()

    if (stErr || !station) {
      return NextResponse.json(
        { success: false, error: 'Clinical station not found.' },
        { status: 404 }
      )
    }

    // 2. Fetch module and level details
    const { data: mod } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id')
      .eq('id', station.module_id)
      .single()

    const levelId = mod?.level_id

    // Fetch study level and bound academic year
    let studyLevel: any = null
    let academicYear: any = null

    if (levelId) {
      const { data: lvl } = await supabaseAdmin
        .from('study_levels')
        .select('id, level_name, academic_year_id')
        .eq('id', levelId)
        .single()

      studyLevel = lvl

      if (studyLevel?.academic_year_id) {
        const { data: yr } = await supabaseAdmin
          .from('academic_years')
          .select('id, year_label')
          .eq('id', studyLevel.academic_year_id)
          .single()

        academicYear = yr
      }
    }

    // 3. Fetch exams for this station
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

    // 4. Fetch exam questions if active exam exists
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

    // 5. Strictly scope sections & groups to this station's study level
    let rawSections: any[] = []
    let rawGroups: any[] = []
    let groupIds: string[] = []
    const groupMap = new Map<string, any>()
    const sectionMap = new Map<string, any>()

    if (levelId) {
      const { data: sections } = await supabaseAdmin
        .from('sections')
        .select('id, section_name, level_id')
        .eq('level_id', levelId)
        .order('section_name', { ascending: true })

      rawSections = sections || []
      rawSections.forEach((s) => sectionMap.set(s.id, s))
      const sectionIds = rawSections.map((s) => s.id)

      if (sectionIds.length > 0) {
        const { data: grps } = await supabaseAdmin
          .from('groups')
          .select('id, group_name, section_id')
          .in('section_id', sectionIds)
          .order('group_name', { ascending: true })

        rawGroups = grps || []
        rawGroups.forEach((g) => {
          const sec = sectionMap.get(g.section_id)
          groupMap.set(g.id, {
            ...g,
            section_name: sec?.section_name || '',
          })
        })
        groupIds = rawGroups.map((g) => g.id)
      }
    }

    // 6. Fetch students strictly enrolled in these scoped groups, preserving Excel import order
    let studentList: any[] = []
    if (groupIds.length > 0) {
      const { data: rawStudents, error: stuErr } = await supabaseAdmin
        .from('students')
        .select('*')
        .in('group_id', groupIds)
        .order('import_index', { ascending: true })
        .order('created_at', { ascending: true })

      if (stuErr) {
        console.error('Error fetching students:', stuErr)
      }
      studentList = rawStudents || []
    }

    // 7. Fetch existing exam_attempts, saved student_answers, and candidate_penalties
    const attemptMap = new Map<string, any>()
    const answersMap = new Map<string, any[]>()
    const penaltiesMap = new Map<string, any[]>()

    if (activeExam && studentList.length > 0) {
      const studentIds = studentList.map((s) => s.id)
      const { data: attempts } = await supabaseAdmin
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', activeExam.id)
        .in('student_id', studentIds)

      const attemptIds = (attempts || []).map((a) => a.id)

      if (attemptIds.length > 0) {
        // Fetch student answers
        const { data: savedAnswers } = await supabaseAdmin
          .from('student_answers')
          .select('id, attempt_id, station_id, question_id, evaluation_score, points_awarded, selected_options')
          .in('attempt_id', attemptIds)
          .eq('station_id', stationId)

        ;(savedAnswers || []).forEach((ans) => {
          if (!answersMap.has(ans.attempt_id)) {
            answersMap.set(ans.attempt_id, [])
          }
          answersMap.get(ans.attempt_id)!.push(ans)
        })

        // Fetch per-candidate penalties strictly from candidate_penalties
        try {
          const { data: penaltiesData } = await supabaseAdmin
            .from('candidate_penalties')
            .select('id, exam_attempt_id, reason, points, created_at')
            .in('exam_attempt_id', attemptIds)
            .order('created_at', { ascending: true })

          ;(penaltiesData || []).forEach((p) => {
            if (!penaltiesMap.has(p.exam_attempt_id)) {
              penaltiesMap.set(p.exam_attempt_id, [])
            }
            penaltiesMap.get(p.exam_attempt_id)!.push({
              id: p.id,
              exam_attempt_id: p.exam_attempt_id,
              reason: p.reason,
              points: Number(p.points),
              created_at: p.created_at,
            })
          })
        } catch (penErr) {
          console.warn('Could not fetch candidate_penalties:', penErr)
        }
      }

      ;(attempts || []).forEach((att) => {
        attemptMap.set(att.student_id, att)
      })
    }

    // 8. Format candidate roster (Strictly Pending or Completed)
    const formattedStudents = studentList.map((st) => {
      const grp = groupMap.get(st.group_id)
      const sec = grp ? sectionMap.get(grp.section_id) : null
      const attempt = attemptMap.get(st.id)
      const savedAnswers = attempt ? answersMap.get(attempt.id) || [] : []
      const candidatePenalties = attempt ? penaltiesMap.get(attempt.id) || [] : []
      const isCompleted = !!attempt && attempt.final_score !== null

      return {
        id: st.id,
        matricule: st.matricule,
        first_name: st.first_name,
        last_name: st.last_name,
        full_name: `${st.last_name} ${st.first_name}`.trim(),
        group_id: st.group_id,
        group_name: grp ? grp.group_name : 'Unassigned',
        section_id: sec?.id || null,
        section_name: sec ? sec.section_name : 'General',
        level_name: studyLevel?.level_name || '',
        academic_year_label: academicYear?.year_label || '',
        import_index: typeof st.import_index === 'number' ? st.import_index : 0,
        attempt_id: attempt?.id || null,
        status: isCompleted ? 'completed' : 'pending',
        final_score: isCompleted ? Number(attempt.final_score) : null,
        saved_answers: savedAnswers.map((ans) => ({
          question_id: ans.question_id,
          selected_options: Array.isArray(ans.selected_options) ? ans.selected_options : [],
          evaluation_score: ans.evaluation_score !== null ? Number(ans.evaluation_score) : 0,
          points_awarded: Number(ans.points_awarded || 0),
        })),
        penalties: candidatePenalties,
      }
    })

    const formattedSections = rawSections.map((s) => ({
      id: s.id,
      section_name: s.section_name,
      level_id: s.level_id,
    }))

    const formattedGroups = rawGroups.map((g) => ({
      id: g.id,
      group_name: g.group_name,
      section_id: g.section_id,
      section_name: sectionMap.get(g.section_id)?.section_name || '',
    }))

    return NextResponse.json({
      success: true,
      station: {
        id: station.id,
        station_number: station.station_number,
        title: station.title,
        module_id: station.module_id,
        module_name: mod?.module_name || 'Medical Module',
        level_id: levelId,
        level_name: studyLevel?.level_name || '',
        academic_year_id: studyLevel?.academic_year_id || null,
        academic_year_label: academicYear?.year_label || '',
      },
      active_exam: activeExam || null,
      exams: exams || [],
      questions: questions || [],
      sections: formattedSections,
      groups: formattedGroups,
      students: formattedStudents,
    })
  } catch (error: any) {
    console.error('examiner/students error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch examiner candidates.' },
      { status: 500 }
    )
  }
}
