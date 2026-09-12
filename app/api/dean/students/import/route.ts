import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { randomUUID } from 'crypto'

export interface ImportStudentPayloadItem {
  matricule: string
  first_name: string
  last_name: string
  section: string
  grp: string
  import_index?: number
}

// Sanitization & Normalization Helpers
export const sanitizeMatricule = (val: any): string => {
  if (!val) return ''
  return String(val).trim().replace(/\s+/g, '')
}

export const sanitizeFirstName = (val: any): string => {
  if (!val) return ''
  const clean = String(val).trim().replace(/\s+/g, ' ')
  if (!clean) return ''
  return clean
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const sanitizeLastName = (val: any): string => {
  if (!val) return ''
  return String(val).trim().replace(/\s+/g, ' ').toUpperCase()
}

export const sanitizeTitleCase = (val: any): string => {
  if (!val) return ''
  const clean = String(val).trim().replace(/\s+/g, ' ')
  if (!clean) return ''
  return clean
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function POST(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { academic_year_id, study_level_id, students } = body as {
      academic_year_id: string
      study_level_id: string
      students: ImportStudentPayloadItem[]
    }

    if (!academic_year_id || !study_level_id || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Target academic year, study level, and student records are required.' },
        { status: 400 }
      )
    }

    // 1. Verify academic year belongs to faculty
    const { data: yearCheck } = await supabaseAdmin
      .from('academic_years')
      .select('id')
      .eq('id', academic_year_id)
      .eq('faculty_id', dean.facultyId)
      .single()

    if (!yearCheck) {
      return NextResponse.json({ success: false, error: 'Invalid academic year or permission denied.' }, { status: 403 })
    }

    // 2. Sanitize payload items and preserve Excel row order (import_index)
    const sanitizedStudents = students
      .map((s, index) => ({
        import_index: typeof s.import_index === 'number' ? s.import_index : index,
        matricule: sanitizeMatricule(s.matricule),
        first_name: sanitizeFirstName(s.first_name),
        last_name: sanitizeLastName(s.last_name),
        section: sanitizeTitleCase(s.section),
        grp: sanitizeTitleCase(s.grp),
      }))
      .filter((s) => s.matricule && s.first_name && s.last_name && s.section && s.grp)

    if (sanitizedStudents.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid student records after sanitization.' }, { status: 400 })
    }

    // 3. Extract unique section names from sanitized payload
    const rawSections = Array.from(new Set(sanitizedStudents.map((s) => s.section)))
    if (rawSections.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid sections detected in spreadsheet.' }, { status: 400 })
    }

    // 4. Auto-provision missing Sections for study_level_id
    const { data: existingSections } = await supabaseAdmin
      .from('sections')
      .select('id, section_name')
      .eq('level_id', study_level_id)

    const sectionMap = new Map<string, string>() // lowercased section_name -> section_id
    ;(existingSections || []).forEach((sec) => {
      sectionMap.set(sec.section_name.trim().toLowerCase(), sec.id)
    })

    const missingSections = rawSections.filter((name) => !sectionMap.has(name.toLowerCase()))
    let createdSectionsCount = 0

    if (missingSections.length > 0) {
      const sectionsToInsert = missingSections.map((name) => ({
        section_name: name,
        level_id: study_level_id,
      }))

      const { data: newlyInsertedSections, error: secErr } = await supabaseAdmin
        .from('sections')
        .insert(sectionsToInsert)
        .select('id, section_name')

      if (secErr) throw secErr

      ;(newlyInsertedSections || []).forEach((sec) => {
        sectionMap.set(sec.section_name.trim().toLowerCase(), sec.id)
      })
      createdSectionsCount = newlyInsertedSections?.length || 0
    }

    // 5. Auto-provision missing Groups for each section
    const uniqueGroupPairsMap = new Map<string, { sectionName: string; groupName: string }>()
    sanitizedStudents.forEach((s) => {
      const pairKey = `${s.section.toLowerCase()}::${s.grp.toLowerCase()}`
      if (!uniqueGroupPairsMap.has(pairKey)) {
        uniqueGroupPairsMap.set(pairKey, { sectionName: s.section, groupName: s.grp })
      }
    })

    const allSectionIds = Array.from(sectionMap.values())
    const { data: existingGroups } = await supabaseAdmin
      .from('groups')
      .select('id, group_name, section_id')
      .in('section_id', allSectionIds)

    const groupKeyMap = new Map<string, string>() // `${section_name.toLowerCase()}::${group_name.toLowerCase()}` -> group_id
    const sectionIdToNameMap = new Map<string, string>()
    sectionMap.forEach((id, name) => sectionIdToNameMap.set(id, name))

    ;(existingGroups || []).forEach((g) => {
      const secName = sectionIdToNameMap.get(g.section_id)
      if (secName) {
        const key = `${secName.toLowerCase()}::${g.group_name.trim().toLowerCase()}`
        groupKeyMap.set(key, g.id)
      }
    })

    const missingGroupsToInsert: Array<{ group_name: string; section_id: string; pairKey: string }> = []
    uniqueGroupPairsMap.forEach((pair, pairKey) => {
      if (!groupKeyMap.has(pairKey)) {
        const secId = sectionMap.get(pair.sectionName.toLowerCase())
        if (secId) {
          missingGroupsToInsert.push({
            group_name: pair.groupName,
            section_id: secId,
            pairKey,
          })
        }
      }
    })

    let createdGroupsCount = 0
    if (missingGroupsToInsert.length > 0) {
      const { data: newlyInsertedGroups, error: grpErr } = await supabaseAdmin
        .from('groups')
        .insert(missingGroupsToInsert.map((g) => ({ group_name: g.group_name, section_id: g.section_id })))
        .select('id, group_name, section_id')

      if (grpErr) throw grpErr

      ;(newlyInsertedGroups || []).forEach((g) => {
        const secName = sectionIdToNameMap.get(g.section_id)
        if (secName) {
          const key = `${secName.toLowerCase()}::${g.group_name.trim().toLowerCase()}`
          groupKeyMap.set(key, g.id)
        }
      })
      createdGroupsCount = newlyInsertedGroups?.length || 0
    }

    // 6. Map each student to their target group_id while preserving Excel import_index
    const studentRecords = sanitizedStudents
      .map((s) => {
        const pairKey = `${s.section.toLowerCase()}::${s.grp.toLowerCase()}`
        const grpId = groupKeyMap.get(pairKey)
        if (!grpId || !s.matricule || !s.first_name || !s.last_name) {
          return null
        }
        return {
          matricule: s.matricule,
          first_name: s.first_name,
          last_name: s.last_name,
          group_id: grpId,
          import_index: s.import_index,
        }
      })
      .filter(Boolean) as Array<{
        matricule: string
        first_name: string
        last_name: string
        group_id: string
        import_index: number
      }>

    if (studentRecords.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid student records to enroll.' }, { status: 400 })
    }

    // 7. Multi-Year Duplicate Check Scoped Strictly to (matricule, group_id)
    // De-duplicate in-payload duplicates first (keeping earliest row or updating)
    const distinctBatchMap = new Map<string, typeof studentRecords[0]>()
    for (const item of studentRecords) {
      const key = `${item.matricule}::${item.group_id}`
      distinctBatchMap.set(key, item)
    }
    const dedupedStudentRecords = Array.from(distinctBatchMap.values())

    // Fetch existing students in the target groups to check for existing (matricule, group_id)
    const targetGroupIds = Array.from(new Set(dedupedStudentRecords.map((s) => s.group_id)))
    const { data: existingInGroups, error: fetchExistingErr } = await supabaseAdmin
      .from('students')
      .select('id, matricule, group_id')
      .in('group_id', targetGroupIds)

    if (fetchExistingErr) throw fetchExistingErr

    const existingStudentMap = new Map<string, string>() // `${matricule}::${group_id}` -> id
    ;(existingInGroups || []).forEach((row) => {
      existingStudentMap.set(`${row.matricule}::${row.group_id}`, row.id)
    })

    // Separate records into inserts (with auto-generated UUID) and updates
    const toInsert: Array<{
      id: string
      matricule: string
      first_name: string
      last_name: string
      group_id: string
      import_index: number
    }> = []

    const toUpdate: Array<{
      id: string
      matricule: string
      first_name: string
      last_name: string
      group_id: string
      import_index: number
    }> = []

    for (const record of dedupedStudentRecords) {
      const pairKey = `${record.matricule}::${record.group_id}`
      const existingId = existingStudentMap.get(pairKey)

      if (existingId) {
        toUpdate.push({
          id: existingId,
          matricule: record.matricule,
          first_name: record.first_name,
          last_name: record.last_name,
          group_id: record.group_id,
          import_index: record.import_index,
        })
      } else {
        toInsert.push({
          id: randomUUID(),
          matricule: record.matricule,
          first_name: record.first_name,
          last_name: record.last_name,
          group_id: record.group_id,
          import_index: record.import_index,
        })
      }
    }

    // Execute Inserts
    if (toInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin.from('students').insert(toInsert)
      if (insertErr) throw insertErr
    }

    // Execute Updates for existing students in the same group
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((up) =>
          supabaseAdmin
            .from('students')
            .update({
              first_name: up.first_name,
              last_name: up.last_name,
              import_index: up.import_index,
            })
            .eq('id', up.id)
        )
      )
    }

    return NextResponse.json({
      success: true,
      importedCount: dedupedStudentRecords.length,
      insertedCount: toInsert.length,
      updatedCount: toUpdate.length,
      createdSectionsCount,
      createdGroupsCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to import student cohort.' },
      { status: 500 }
    )
  }
}
