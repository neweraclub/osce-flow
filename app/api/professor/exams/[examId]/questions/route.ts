import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { getStationSlug } from '@/lib/stationSlug'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { examId } = await params
    if (!examId) {
      return NextResponse.json({ success: false, error: 'Exam ID is required.' }, { status: 400 })
    }

    // 1. Fetch Exam
    const { data: exam, error: exErr } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (exErr || !exam) {
      return NextResponse.json({ success: false, error: 'Exam session not found.' }, { status: 404 })
    }

    // 2. Fetch Station (stations.exam_id)
    const { data: station } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle()

    // 3. Fetch Module info
    let moduleName = 'General Module'
    let levelName = 'General Level'
    const moduleId = exam.module_id
    if (moduleId) {
      const { data: mod } = await supabaseAdmin
        .from('modules')
        .select('module_name, level_id')
        .eq('id', moduleId)
        .maybeSingle()

      if (mod?.module_name) moduleName = mod.module_name
      if (mod?.level_id) {
        const { data: lvl } = await supabaseAdmin
          .from('study_levels')
          .select('level_name')
          .eq('id', mod.level_id)
          .maybeSingle()
        if (lvl?.level_name) levelName = lvl.level_name
      }
    }

    // 4. Fetch Questions (questions.station_id)
    let questions: any[] = []
    if (station?.id) {
      const { data: qData, error: qErr } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('station_id', station.id)
        .order('created_at', { ascending: true })

      if (qErr) throw qErr
      questions = qData || []
    }

    // 5. Fetch Live Candidates & Attempts strictly from Supabase
    let candidates: any[] = []
    if (station?.id) {
      // 5a. Fetch existing attempts for this station
      const { data: attempts } = await supabaseAdmin
        .from('exam_attempts')
        .select('*')
        .eq('station_id', station.id)

      const attemptMap = new Map<string, any>()
      const attemptStudentIds = new Set<string>()
      const attemptIds: string[] = []

      ;(attempts || []).forEach((att) => {
        attemptMap.set(att.student_id, att)
        attemptStudentIds.add(att.student_id)
        attemptIds.push(att.id)
      })

      // 5b. Fetch level sections and groups to scope enrolled candidates
      const groupMap = new Map<string, { group_name: string; section_name: string }>()
      let groupIds: string[] = []

      if (moduleId) {
        const { data: modData } = await supabaseAdmin
          .from('modules')
          .select('level_id')
          .eq('id', moduleId)
          .maybeSingle()

        if (modData?.level_id) {
          const { data: sections } = await supabaseAdmin
            .from('sections')
            .select('id, section_name')
            .eq('level_id', modData.level_id)

          const sectionMap = new Map((sections || []).map((s) => [s.id, s.section_name]))
          const sectionIds = (sections || []).map((s) => s.id)

          if (sectionIds.length > 0) {
            const { data: grps } = await supabaseAdmin
              .from('groups')
              .select('id, group_name, section_id')
              .in('section_id', sectionIds)

            ;(grps || []).forEach((g) => {
              groupMap.set(g.id, {
                group_name: g.group_name,
                section_name: sectionMap.get(g.section_id) || '',
              })
            })
            groupIds = (grps || []).map((g) => g.id)
          }
        }
      }

      // 5c. Fetch enrolled students
      let enrolledStudents: any[] = []
      if (groupIds.length > 0) {
        const { data: studs } = await supabaseAdmin
          .from('students')
          .select('*')
          .in('group_id', groupIds)
          .order('import_index', { ascending: true })
          .order('matricule', { ascending: true })

        enrolledStudents = studs || []
      }

      // Also include any students with existing attempts on this station
      const enrolledStudentIdSet = new Set(enrolledStudents.map((s) => s.id))
      const extraStudentIds = Array.from(attemptStudentIds).filter((id) => !enrolledStudentIdSet.has(id))

      if (extraStudentIds.length > 0) {
        const { data: extraStuds } = await supabaseAdmin
          .from('students')
          .select('*')
          .in('id', extraStudentIds)

        if (extraStuds) {
          enrolledStudents = [...enrolledStudents, ...extraStuds]
        }
      }

      // 5d. Fetch student answers, penalties, and bonuses for attempts
      const answersMap = new Map<string, any[]>()
      const penaltiesMap = new Map<string, any[]>()
      const bonusesMap = new Map<string, any[]>()

      if (attemptIds.length > 0) {
        const [answersRes, penaltiesRes, bonusesRes] = await Promise.all([
          supabaseAdmin
            .from('student_answers')
            .select('id, attempt_id, question_id, points_awarded')
            .in('attempt_id', attemptIds),
          supabaseAdmin
            .from('candidate_penalties')
            .select('id, exam_attempt_id, reason, points')
            .in('exam_attempt_id', attemptIds),
          supabaseAdmin
            .from('candidate_bonuses')
            .select('id, exam_attempt_id, reason, points')
            .in('exam_attempt_id', attemptIds),
        ])

        ;(answersRes.data || []).forEach((a) => {
          if (!answersMap.has(a.attempt_id)) answersMap.set(a.attempt_id, [])
          answersMap.get(a.attempt_id)!.push(a)
        })

        ;(penaltiesRes.data || []).forEach((p) => {
          if (!penaltiesMap.has(p.exam_attempt_id)) penaltiesMap.set(p.exam_attempt_id, [])
          penaltiesMap.get(p.exam_attempt_id)!.push(p)
        })

        ;(bonusesRes.data || []).forEach((b) => {
          if (!bonusesMap.has(b.exam_attempt_id)) bonusesMap.set(b.exam_attempt_id, [])
          bonusesMap.get(b.exam_attempt_id)!.push(b)
        })
      }

      // 5e. Format live candidate items
      const totalQuestionsCount = questions.length

      candidates = enrolledStudents.map((student) => {
        const attempt = attemptMap.get(student.id)
        const groupInfo = groupMap.get(student.group_id)
        const rotation_group = groupInfo
          ? groupInfo.section_name
            ? `${groupInfo.section_name} - ${groupInfo.group_name}`
            : groupInfo.group_name
          : 'Candidate'

        if (!attempt) {
          return {
            id: student.id,
            student_id: student.id,
            attempt_id: null,
            matricule: student.matricule,
            full_name: `${student.first_name} ${student.last_name}`,
            rotation_group,
            status: 'pending',
            max_score: 20,
            elapsed_seconds: 0,
            items_evaluated: 0,
            total_items: totalQuestionsCount,
          }
        }

        const studentAnswers = answersMap.get(attempt.id) || []
        const studentPenalties = penaltiesMap.get(attempt.id) || []
        const studentBonuses = bonusesMap.get(attempt.id) || []

        const rawScore = studentAnswers.reduce((sum, a) => sum + Number(a.points_awarded || 0), 0)
        const penaltyTotal = studentPenalties.reduce(
          (sum, p) => sum + Math.abs(Number(p.points || 0)),
          0
        )
        const bonusTotal = studentBonuses.reduce((sum, b) => sum + Number(b.points || 0), 0)
        const netScore = Math.max(0, Math.min(20, rawScore - penaltyTotal + bonusTotal))

        const isCompleted = attempt.status === 'completed'
        const hasAnswers = studentAnswers.length > 0
        const status = isCompleted ? 'submitted' : hasAnswers ? 'in_progress' : 'pending'

        let elapsed_seconds = 0
        if (attempt.created_at) {
          const startTime = new Date(attempt.created_at).getTime()
          const endTime =
            isCompleted && attempt.updated_at ? new Date(attempt.updated_at).getTime() : Date.now()
          elapsed_seconds = Math.max(0, Math.floor((endTime - startTime) / 1000))
        }

        const notes: string[] = []
        if (studentBonuses.length > 0) notes.push(`Bonus: ${studentBonuses[0].reason}`)
        if (studentPenalties.length > 0) notes.push(`Deduction: ${studentPenalties[0].reason}`)

        return {
          id: student.id,
          student_id: student.id,
          attempt_id: attempt.id,
          matricule: student.matricule,
          full_name: `${student.first_name} ${student.last_name}`,
          rotation_group,
          status,
          score: isCompleted ? Number(netScore.toFixed(2)) : undefined,
          max_score: 20,
          elapsed_seconds,
          items_evaluated: studentAnswers.length,
          total_items: totalQuestionsCount,
          examiner_note: notes.join(' | ') || undefined,
        }
      })
    }

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        module_id: exam.module_id,
        session_type: exam.session_type || 'regular',
        exam_date: exam.exam_date,
        created_at: exam.created_at,
      },
      station: station
        ? {
            id: station.id,
            slug: getStationSlug({
              station_number: station.station_number,
              module_name: moduleName,
              id: station.id,
            }),
            module_id: exam.module_id,
            station_number: station.station_number,
            title: station.title,
            access_pin: station.access_pin,
            weightage_percentage: Number(station.weightage_percentage || 0),
            module_name: moduleName,
            level_name: levelName,
          }
        : null,
      questions,
      candidates,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch exam questions.' },
      { status: 500 }
    )
  }
}
