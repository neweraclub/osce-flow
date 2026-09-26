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

    // 1. Fetch station details with joined exam, module, and study level hierarchy
    const { data: station, error: stErr } = await supabaseAdmin
      .from('stations')
      .select(`
        *,
        exams (
          id,
          module_id,
          session_type,
          exam_date,
          created_at,
          modules (
            id,
            module_name,
            level_id,
            study_levels (
              id,
              level_name,
              academic_year_id,
              academic_years (
                id,
                year_label
              )
            )
          )
        )
      `)
      .eq('id', stationId)
      .single()

    if (stErr || !station) {
      return NextResponse.json(
        { success: false, error: 'Clinical station not found.' },
        { status: 404 }
      )
    }

    // 2. Resolve active exam, module, and study level hierarchy
    let activeExam: any = null
    const stationExam = Array.isArray(station.exams) ? station.exams[0] : station.exams

    if (examIdParam) {
      if (stationExam?.id === examIdParam) {
        activeExam = stationExam
      } else {
        const { data: exParamData } = await supabaseAdmin
          .from('exams')
          .select(`
            id,
            module_id,
            session_type,
            exam_date,
            created_at,
            modules (
              id,
              module_name,
              level_id,
              study_levels (
                id,
                level_name,
                academic_year_id,
                academic_years (
                  id,
                  year_label
                )
              )
            )
          `)
          .eq('id', examIdParam)
          .maybeSingle()
        if (exParamData) {
          activeExam = exParamData
        }
      }
    }

    if (!activeExam) {
      activeExam = stationExam
    }

    // Fallback if exam was not joined via relational query
    if (!activeExam && station.exam_id) {
      const { data: directExam } = await supabaseAdmin
        .from('exams')
        .select(`
          id,
          module_id,
          session_type,
          exam_date,
          created_at,
          modules (
            id,
            module_name,
            level_id,
            study_levels (
              id,
              level_name,
              academic_year_id,
              academic_years (
                id,
                year_label
              )
            )
          )
        `)
        .eq('id', station.exam_id)
        .maybeSingle()
      if (directExam) {
        activeExam = directExam
      }
    }

    const exams = activeExam ? [activeExam] : []

    let mod = Array.isArray(activeExam?.modules) ? activeExam.modules[0] : activeExam?.modules
    let moduleId = activeExam?.module_id || mod?.id || (station as any).module_id || null

    if (!mod && moduleId) {
      const { data: directMod } = await supabaseAdmin
        .from('modules')
        .select(`
          id,
          module_name,
          level_id,
          study_levels (
            id,
            level_name,
            academic_year_id,
            academic_years (
              id,
              year_label
            )
          )
        `)
        .eq('id', moduleId)
        .maybeSingle()
      if (directMod) {
        mod = directMod
      }
    }

    // Active Station's target study level ID from modules.level_id
    const levelId: string | null = mod?.level_id || null

    let studyLevel = Array.isArray(mod?.study_levels) ? mod.study_levels[0] : mod?.study_levels
    let academicYear = Array.isArray(studyLevel?.academic_years) ? studyLevel.academic_years[0] : studyLevel?.academic_years

    if (!studyLevel && levelId) {
      const { data: lvl } = await supabaseAdmin
        .from('study_levels')
        .select(`
          id,
          level_name,
          academic_year_id,
          academic_years (
            id,
            year_label
          )
        `)
        .eq('id', levelId)
        .maybeSingle()
      if (lvl) {
        studyLevel = lvl
        academicYear = Array.isArray(lvl.academic_years) ? lvl.academic_years[0] : lvl.academic_years
      }
    }

    // 3. Fetch questions: belongs to stations (station_id), fallback to exam_id
    let questions: any[] = []
    const { data: qData } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('station_id', stationId)
      .order('created_at', { ascending: true })

    if (qData && qData.length > 0) {
      questions = qData
    } else if (activeExam?.id) {
      const { data: qLegacy } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('exam_id', activeExam.id)
        .order('created_at', { ascending: true })
      if (qLegacy) questions = qLegacy
    }

    // 3b. Calculate station-scoped max possible points
    let stationMaxPoints = 0
    if (questions.length > 0) {
      stationMaxPoints = questions.reduce(
        (sum, q) => sum + (Number(q.max_scale_value) || 10),
        0
      )
    } else {
      stationMaxPoints = 10
    }

    // 3c. Fetch preset criteria/penalties for this station
    const { data: criteriaData } = await supabaseAdmin
      .from('station_criteria')
      .select('id, station_id, title, description, points')
      .eq('station_id', stationId)
      .order('created_at', { ascending: true })

    const stationCriteria = (criteriaData || []).map((c) => ({
      id: c.id,
      station_id: c.station_id,
      title: c.title,
      description: c.description,
      points: Number(c.points),
    }))

    // 3d. Fetch preset merit bonuses for this station
    const { data: bonusesData } = await supabaseAdmin
      .from('station_bonuses')
      .select('id, station_id, title, description, points')
      .eq('station_id', stationId)
      .order('points', { ascending: false })

    const stationBonuses = (bonusesData || []).map((b) => ({
      id: b.id,
      station_id: b.station_id,
      title: b.title,
      description: b.description,
      points: Number(b.points),
    }))

    // 4. Strictly scope sections & groups to this station's study level
    let rawSections: any[] = []
    let rawGroups: any[] = []
    let groupIds: string[] = []
    const groupMap = new Map<string, any>()
    const sectionMap = new Map<string, any>()

    if (levelId) {
      const { data: sections } = await supabaseAdmin
        .from('sections')
        .select(`
          id,
          section_name,
          level_id,
          study_levels (
            id,
            level_name,
            academic_year_id,
            academic_years (
              id,
              year_label
            )
          )
        `)
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
          const sl = Array.isArray(sec?.study_levels) ? sec.study_levels[0] : sec?.study_levels
          const yr = Array.isArray(sl?.academic_years) ? sl.academic_years[0] : sl?.academic_years

          groupMap.set(g.id, {
            ...g,
            section_name: sec?.section_name || '',
            level_id: sec?.level_id || levelId,
            level_name: sl?.level_name || studyLevel?.level_name || '',
            academic_year_label: yr?.year_label || academicYear?.year_label || '',
          })
        })
        groupIds = rawGroups.map((g) => g.id)
      }
    }

    // 5. Enforce Strict Relational Filtering:
    // Traverse students -> groups -> sections -> study_levels and match study_levels.id against active station module levelId
    let studentList: any[] = []
    if (groupIds.length > 0 && levelId) {
      const { data: rawStudents, error: stuErr } = await supabaseAdmin
        .from('students')
        .select(`
          id,
          matricule,
          first_name,
          last_name,
          group_id,
          import_index,
          created_at,
          groups!inner (
            id,
            group_name,
            section_id,
            sections!inner (
              id,
              section_name,
              level_id,
              study_levels!inner (
                id,
                level_name,
                academic_year_id,
                academic_years (
                  id,
                  year_label
                )
              )
            )
          )
        `)
        .in('group_id', groupIds)
        .order('import_index', { ascending: true })
        .order('created_at', { ascending: true })

      if (stuErr) {
        console.error('Error fetching students with relational inner join:', stuErr)
        // Fallback to direct group_id query if nested inner join syntax is unsupported
        const { data: fallbackStudents } = await supabaseAdmin
          .from('students')
          .select('id, matricule, first_name, last_name, group_id, import_index, created_at')
          .in('group_id', groupIds)
          .order('import_index', { ascending: true })
          .order('created_at', { ascending: true })

        studentList = fallbackStudents || []
      } else {
        // Defensive Hierarchical Filter: Eliminate Cross-Year Contamination
        studentList = (rawStudents || []).filter((st: any) => {
          const g = Array.isArray(st.groups) ? st.groups[0] : st.groups
          const s = Array.isArray(g?.sections) ? g.sections[0] : g?.sections
          const l = Array.isArray(s?.study_levels) ? s.study_levels[0] : s?.study_levels
          const studentLevelId = s?.level_id || l?.id

          return studentLevelId === levelId
        })
      }
    }

    // 6. Fetch existing exam_attempts (scoped to station_id), saved student_answers, candidate_penalties, and candidate_bonuses
    const attemptMap = new Map<string, any>()
    const answersMap = new Map<string, any[]>()
    const penaltiesMap = new Map<string, any[]>()
    const bonusesMap = new Map<string, any[]>()

    if (studentList.length > 0) {
      const studentIds = studentList.map((s) => s.id)
      const { data: attempts } = await supabaseAdmin
        .from('exam_attempts')
        .select('*')
        .eq('station_id', stationId)
        .in('student_id', studentIds)

      const attemptIds = (attempts || []).map((a) => a.id)

      if (attemptIds.length > 0) {
        // Fetch student answers
        const { data: savedAnswers } = await supabaseAdmin
          .from('student_answers')
          .select('id, attempt_id, question_id, points_awarded, selected_options')
          .in('attempt_id', attemptIds)

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
            .select('id, exam_attempt_id, criteria_id, reason, points, created_at')
            .in('exam_attempt_id', attemptIds)
            .order('created_at', { ascending: true })

          ;(penaltiesData || []).forEach((p) => {
            if (!penaltiesMap.has(p.exam_attempt_id)) {
              penaltiesMap.set(p.exam_attempt_id, [])
            }
            penaltiesMap.get(p.exam_attempt_id)!.push({
              id: p.id,
              exam_attempt_id: p.exam_attempt_id,
              criteria_id: p.criteria_id || null,
              reason: p.reason,
              points: Number(p.points),
              created_at: p.created_at,
            })
          })
        } catch (penErr) {
          console.warn('Could not fetch candidate_penalties:', penErr)
        }

        // Fetch per-candidate bonuses strictly from candidate_bonuses
        try {
          const { data: bonusesData } = await supabaseAdmin
            .from('candidate_bonuses')
            .select('id, exam_attempt_id, criteria_id, reason, points, created_at')
            .in('exam_attempt_id', attemptIds)
            .order('created_at', { ascending: true })

          ;(bonusesData || []).forEach((b) => {
            if (!bonusesMap.has(b.exam_attempt_id)) {
              bonusesMap.set(b.exam_attempt_id, [])
            }
            bonusesMap.get(b.exam_attempt_id)!.push({
              id: b.id,
              exam_attempt_id: b.exam_attempt_id,
              criteria_id: b.criteria_id || null,
              reason: b.reason,
              points: Number(b.points),
              created_at: b.created_at,
            })
          })
        } catch (bonErr) {
          console.warn('Could not fetch candidate_bonuses:', bonErr)
        }
      }

      ;(attempts || []).forEach((att) => {
        attemptMap.set(att.student_id, att)
      })
    }

    // 7. Format candidate roster with Synchronized Student Database Study Level State
    const formattedStudents = studentList.map((st) => {
      const g = Array.isArray(st.groups) ? st.groups[0] : (st.groups || groupMap.get(st.group_id))
      const sec = Array.isArray(g?.sections) ? g.sections[0] : (g?.sections || (g?.section_id ? sectionMap.get(g.section_id) : null))
      const sl = Array.isArray(sec?.study_levels) ? sec.study_levels[0] : sec?.study_levels
      const yr = Array.isArray(sl?.academic_years) ? sl.academic_years[0] : sl?.academic_years

      const grpInfo = groupMap.get(st.group_id)

      // Verified true database level and academic year label
      const studentLevelName = sl?.level_name || grpInfo?.level_name || studyLevel?.level_name || ''
      const studentAcademicYearLabel = yr?.year_label || grpInfo?.academic_year_label || academicYear?.year_label || ''
      const studentSectionName = sec?.section_name || grpInfo?.section_name || 'General'
      const studentGroupName = g?.group_name || grpInfo?.group_name || 'Unassigned'

      const attempt = attemptMap.get(st.id)
      const savedAnswers = attempt ? answersMap.get(attempt.id) || [] : []
      const candidatePenalties = attempt ? penaltiesMap.get(attempt.id) || [] : []
      const candidateBonuses = attempt ? bonusesMap.get(attempt.id) || [] : []

      const isCompleted = attempt?.status === 'completed' || (attempt && (savedAnswers.length > 0 || typeof attempt.final_score === 'number'))

      // Dynamic Net Raw Score: GREATEST(0, earnedScore + totalDeductions + totalBonuses)
      const earnedScore = savedAnswers.reduce((sum: number, a: any) => sum + (Number(a.points_awarded) || 0), 0)
      const totalDeductions = candidatePenalties.reduce((sum: number, p: any) => sum + (Number(p.points) || 0), 0)
      const totalBonuses = candidateBonuses.reduce((sum: number, b: any) => sum + (Number(b.points) || 0), 0)
      const dynamicFinalScore = isCompleted
        ? Math.max(0, Math.round((earnedScore + totalDeductions + totalBonuses) * 100) / 100)
        : null

      return {
        id: st.id,
        matricule: st.matricule,
        first_name: st.first_name,
        last_name: st.last_name,
        full_name: `${st.last_name} ${st.first_name}`.trim(),
        group_id: st.group_id,
        group_name: studentGroupName,
        section_id: sec?.id || null,
        section_name: studentSectionName,
        level_id: sec?.level_id || sl?.id || levelId,
        level_name: studentLevelName,
        academic_year_label: studentAcademicYearLabel,
        import_index: typeof st.import_index === 'number' ? st.import_index : 0,
        attempt_id: attempt?.id || null,
        status: isCompleted ? 'completed' : 'pending',
        final_score: dynamicFinalScore,
        saved_answers: savedAnswers.map((ans) => ({
          question_id: ans.question_id,
          selected_options: Array.isArray(ans.selected_options) ? ans.selected_options : [],
          evaluation_score: Number(ans.points_awarded || 0),
          points_awarded: Number(ans.points_awarded || 0),
        })),
        penalties: candidatePenalties,
        bonuses: candidateBonuses,
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
        module_id: moduleId,
        module_name: mod?.module_name || 'Medical Module',
        level_id: levelId,
        level_name: studyLevel?.level_name || '',
        academic_year_id: studyLevel?.academic_year_id || null,
        academic_year_label: academicYear?.year_label || '',
        max_points: stationMaxPoints,
      },
      station_max_points: stationMaxPoints,
      active_exam: activeExam || null,
      exams: exams || [],
      questions: questions || [],
      criteria: stationCriteria,
      bonuses_criteria: stationBonuses,
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
