import { supabaseAdmin } from '@/lib/auth'

export interface FacultyHierarchy {
  facultyId: string
  yearIds: string[]
  levelIds: string[]
  sectionIds: string[]
  groupIds: string[]
  moduleIds: string[]
  examIds: string[]
  userIds: string[]
}

/**
 * Resolves all relational IDs strictly belonging to a faculty (and optionally a specific academic year).
 * Relational join paths:
 * - Academic Years: academic_years.faculty_id = faculty_id
 * - Study Levels: study_levels.academic_year_id -> academic_years.id
 * - Sections: sections.level_id -> study_levels.id
 * - Groups: groups.section_id -> sections.id
 * - Modules: modules.level_id -> study_levels.id
 * - Exams: exams.module_id -> modules.id
 * - Stations: stations.exam_id -> exams.id
 * - Evaluators: professors.user_id -> users.faculty_id
 */
export async function getFacultyHierarchyIds(
  facultyId: string,
  specificYearId?: string | null
): Promise<FacultyHierarchy> {
  const emptyHierarchy: FacultyHierarchy = {
    facultyId,
    yearIds: [],
    levelIds: [],
    sectionIds: [],
    groupIds: [],
    moduleIds: [],
    examIds: [],
    userIds: [],
  }

  if (!facultyId) return emptyHierarchy

  // 1. Fetch Academic Years for this faculty
  let yearQuery = supabaseAdmin
    .from('academic_years')
    .select('id')
    .eq('faculty_id', facultyId)

  if (specificYearId) {
    yearQuery = yearQuery.eq('id', specificYearId)
  }

  const { data: years } = await yearQuery
  const yearIds = (years || []).map((y) => y.id)
  if (yearIds.length === 0) {
    return emptyHierarchy
  }

  // 2. Fetch Study Levels linked to these Academic Years
  const { data: levels } = await supabaseAdmin
    .from('study_levels')
    .select('id')
    .in('academic_year_id', yearIds)

  const levelIds = (levels || []).map((l) => l.id)
  if (levelIds.length === 0) {
    return { ...emptyHierarchy, yearIds }
  }

  // 3. Fetch Sections linked to these Study Levels
  const { data: sections } = await supabaseAdmin
    .from('sections')
    .select('id')
    .in('level_id', levelIds)

  const sectionIds = (sections || []).map((s) => s.id)

  // 4. Fetch Groups linked to these Sections
  let groupIds: string[] = []
  if (sectionIds.length > 0) {
    const { data: groups } = await supabaseAdmin
      .from('groups')
      .select('id')
      .in('section_id', sectionIds)

    groupIds = (groups || []).map((g) => g.id)
  }

  // 5. Fetch Clinical Modules linked to these Study Levels
  const { data: modules } = await supabaseAdmin
    .from('modules')
    .select('id')
    .in('level_id', levelIds)

  const moduleIds = (modules || []).map((m) => m.id)

  // 6. Fetch Scheduled Exams linked to these Modules
  let examIds: string[] = []
  if (moduleIds.length > 0) {
    const { data: exams } = await supabaseAdmin
      .from('exams')
      .select('id')
      .in('module_id', moduleIds)

    examIds = (exams || []).map((e) => e.id)
  }

  // 7. Fetch User IDs belonging to this faculty
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('faculty_id', facultyId)

  const userIds = (users || []).map((u) => u.id)

  return {
    facultyId,
    yearIds,
    levelIds,
    sectionIds,
    groupIds,
    moduleIds,
    examIds,
    userIds,
  }
}

/**
 * Verifies that a study level belongs to the faculty via academic_years.faculty_id
 */
export async function verifyStudyLevelBelongsToFaculty(
  levelId: string,
  facultyId: string
): Promise<boolean> {
  if (!levelId || !facultyId) return false

  const { data: level } = await supabaseAdmin
    .from('study_levels')
    .select('id, academic_year_id')
    .eq('id', levelId)
    .maybeSingle()

  if (!level || !level.academic_year_id) return false

  const { data: year } = await supabaseAdmin
    .from('academic_years')
    .select('id, faculty_id')
    .eq('id', level.academic_year_id)
    .maybeSingle()

  return year?.faculty_id === facultyId
}

/**
 * Verifies that a clinical module belongs to the faculty:
 * modules.level_id -> study_levels.academic_year_id -> academic_years.faculty_id
 */
export async function verifyModuleBelongsToFaculty(
  moduleId: string,
  facultyId: string
): Promise<boolean> {
  if (!moduleId || !facultyId) return false

  const { data: mod } = await supabaseAdmin
    .from('modules')
    .select('id, level_id')
    .eq('id', moduleId)
    .maybeSingle()

  if (!mod || !mod.level_id) return false
  return verifyStudyLevelBelongsToFaculty(mod.level_id, facultyId)
}

/**
 * Verifies that an exam session belongs to the faculty:
 * exams.module_id -> modules.level_id -> study_levels.academic_year_id -> academic_years.faculty_id
 */
export async function verifyExamBelongsToFaculty(
  examId: string,
  facultyId: string
): Promise<boolean> {
  if (!examId || !facultyId) return false

  const { data: exam } = await supabaseAdmin
    .from('exams')
    .select('id, module_id')
    .eq('id', examId)
    .maybeSingle()

  if (!exam || !exam.module_id) return false
  return verifyModuleBelongsToFaculty(exam.module_id, facultyId)
}

/**
 * Verifies that a clinical station belongs to the faculty:
 * stations.exam_id -> exams.module_id -> modules.level_id -> study_levels.academic_year_id -> academic_years.faculty_id
 */
export async function verifyStationBelongsToFaculty(
  stationId: string,
  facultyId: string
): Promise<boolean> {
  if (!stationId || !facultyId) return false

  const { data: station } = await supabaseAdmin
    .from('stations')
    .select('id, exam_id')
    .eq('id', stationId)
    .maybeSingle()

  if (!station || !station.exam_id) return false
  return verifyExamBelongsToFaculty(station.exam_id, facultyId)
}

/**
 * Verifies that a professor evaluator belongs to the faculty:
 * professors.user_id -> users.faculty_id
 */
export async function verifyProfessorBelongsToFaculty(
  professorId: string,
  facultyId: string
): Promise<boolean> {
  if (!professorId || !facultyId) return false

  const { data: prof } = await supabaseAdmin
    .from('professors')
    .select('id, user_id')
    .eq('id', professorId)
    .maybeSingle()

  if (!prof || !prof.user_id) return false

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, faculty_id')
    .eq('id', prof.user_id)
    .maybeSingle()

  return user?.faculty_id === facultyId
}
