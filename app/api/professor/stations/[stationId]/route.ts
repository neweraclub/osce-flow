import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { resolveStationRecord } from '@/lib/stationResolver'
import { getStationSlug } from '@/lib/stationSlug'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { stationId } = await params
    if (!stationId) {
      return NextResponse.json({ success: false, error: 'Station identifier is required.' }, { status: 400 })
    }

    // Resolve station by human-readable slug or raw UUID
    const resolved = await resolveStationRecord(stationId, prof)
    if (resolved.unauthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view this station.' },
        { status: 403 }
      )
    }
    if (!resolved.station) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    const { station, module: mod, levelName, slug } = resolved

    // Fetch Linked Exam for this Station
    let linkedExam: any = null
    if (station.exam_id) {
      const { data: ex } = await supabaseAdmin
        .from('exams')
        .select('*')
        .eq('id', station.exam_id)
        .maybeSingle()
      linkedExam = ex
    }

    // Fetch Questions for this station (questions.station_id)
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('station_id', station.id)
      .order('created_at', { ascending: true })

    if (qErr) throw qErr

    const criteria: any[] = []

    const formattedExams = linkedExam
      ? [
          {
            id: linkedExam.id,
            session_type: linkedExam.session_type || 'regular',
            exam_date: linkedExam.exam_date,
            question_count: (questions || []).length,
            created_at: linkedExam.created_at,
          },
        ]
      : []

    // Fetch modules assigned to this professor for modal dropdown
    const { data: profModules } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id')
      .or(`responsible_prof_id.eq.${prof.professorId},responsible_prof_id.eq.${prof.userId}`)
      .order('module_name', { ascending: true })

    const assignedModulesList = profModules || []
    const levelIds = Array.from(
      new Set(assignedModulesList.map((m) => m.level_id).filter(Boolean))
    )
    const levelMap = new Map<string, string>()
    if (levelIds.length > 0) {
      const { data: levelsData } = await supabaseAdmin
        .from('study_levels')
        .select('id, level_name')
        .in('id', levelIds)
      ;(levelsData || []).forEach((l) => levelMap.set(l.id, l.level_name))
    }

    const assignedModules = assignedModulesList.map((m) => ({
      id: m.id,
      module_name: m.module_name,
      level_name: levelMap.get(m.level_id) || 'General Level',
    }))

    // Calculate total weightage per module via exams
    const assignedModuleIds = assignedModulesList.map((m) => m.id)
    const moduleWeightageMap: Record<string, number> = {}
    if (assignedModuleIds.length > 0) {
      const { data: modExams } = await supabaseAdmin
        .from('exams')
        .select('id, module_id')
        .in('module_id', assignedModuleIds)

      const examToMod = new Map((modExams || []).map((e) => [e.id, e.module_id]))
      const exIds = (modExams || []).map((e) => e.id)

      if (exIds.length > 0) {
        const { data: modStations } = await supabaseAdmin
          .from('stations')
          .select('exam_id, weightage_percentage')
          .in('exam_id', exIds)

        ;(modStations || []).forEach((st) => {
          const mId = examToMod.get(st.exam_id)
          if (mId) {
            moduleWeightageMap[mId] =
              (moduleWeightageMap[mId] || 0) + Number(st.weightage_percentage || 0)
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      station: {
        id: station.id,
        slug,
        exam_id: station.exam_id,
        module_id: mod?.id || linkedExam?.module_id || null,
        station_number: station.station_number,
        title: station.title,
        access_pin: station.access_pin,
        weightage_percentage: Number(station.weightage_percentage || 0),
        module_name: mod ? mod.module_name : 'General Module',
        level_name: levelName || 'General Level',
        session_type: linkedExam?.session_type || 'regular',
        exam_date: linkedExam?.exam_date || null,
        created_at: station.created_at,
      },
      questions: questions || [],
      criteria: criteria || [],
      exams: formattedExams,
      assigned_modules: assignedModules,
      module_weightage_map: moduleWeightageMap,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch station details.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { stationId } = await params
    if (!stationId) {
      return NextResponse.json({ success: false, error: 'Station identifier is required.' }, { status: 400 })
    }

    const resolved = await resolveStationRecord(stationId, prof)
    if (resolved.unauthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You are not assigned to manage this station.' },
        { status: 403 }
      )
    }
    if (!resolved.station) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    const currentStation = resolved.station
    const body = await req.json()
    const { title, station_number, access_pin, weightage_percentage } = body

    const updatePayload: any = {}

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ success: false, error: 'Station title cannot be empty.' }, { status: 400 })
      }
      updatePayload.title = title.trim()
    }

    if (station_number !== undefined) {
      const num = Number(station_number)
      if (num < 1) {
        return NextResponse.json({ success: false, error: 'Station number must be at least 1.' }, { status: 400 })
      }
      updatePayload.station_number = num
    }

    if (access_pin !== undefined) {
      const pinStr = String(access_pin).trim()
      if (pinStr.length < 4) {
        return NextResponse.json({ success: false, error: 'Access PIN must be at least 4 characters.' }, { status: 400 })
      }
      updatePayload.access_pin = pinStr
    }

    if (weightage_percentage !== undefined) {
      updatePayload.weightage_percentage = Math.max(0, Math.min(100, Number(weightage_percentage) || 0))
    }

    const targetWeightage =
      updatePayload.weightage_percentage !== undefined
        ? updatePayload.weightage_percentage
        : Number(currentStation.weightage_percentage || 0)

    // Validate cumulative weightage in target exam session
    if (currentStation.exam_id) {
      const { data: otherStations, error: otherStationsErr } = await supabaseAdmin
        .from('stations')
        .select('weightage_percentage')
        .eq('exam_id', currentStation.exam_id)
        .neq('id', currentStation.id)

      if (otherStationsErr) {
        throw otherStationsErr
      }

      const otherTotal = (otherStations || []).reduce(
        (sum, s) => sum + Number(s.weightage_percentage || 0),
        0
      )
      const availableWeightage = Math.max(0, Math.round((100 - otherTotal) * 100) / 100)

      if (otherTotal + targetWeightage > 100) {
        return NextResponse.json(
          {
            success: false,
            error: `Total station weightage for this session cannot exceed 100% (Maximum available: ${availableWeightage}%).`,
          },
          { status: 400 }
        )
      }
    }

    const { data: updatedStation, error: updateErr } = await supabaseAdmin
      .from('stations')
      .update(updatePayload)
      .eq('id', currentStation.id)
      .select()
      .single()

    if (updateErr) {
      if (updateErr.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'This Access PIN is already in use by another station. Please choose another PIN.' },
          { status: 400 }
        )
      }
      throw updateErr
    }

    const updatedSlug = getStationSlug({
      station_number: updatedStation.station_number,
      module_name: resolved.module?.module_name,
      id: updatedStation.id,
    })

    return NextResponse.json({
      success: true,
      station: {
        id: updatedStation.id,
        slug: updatedSlug,
        exam_id: updatedStation.exam_id,
        module_id: resolved.module?.id || null,
        station_number: updatedStation.station_number,
        title: updatedStation.title,
        access_pin: updatedStation.access_pin,
        weightage_percentage: Number(updatedStation.weightage_percentage || 0),
        module_name: resolved.module ? resolved.module.module_name : 'General Module',
        level_name: resolved.levelName || 'General Level',
        created_at: updatedStation.created_at,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update station.' },
      { status: 500 }
    )
  }
}

export const PATCH = PUT

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { stationId } = await params
    if (!stationId) {
      return NextResponse.json({ success: false, error: 'Station identifier is required.' }, { status: 400 })
    }

    const resolved = await resolveStationRecord(stationId, prof)
    if (resolved.unauthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You are not assigned to delete this station.' },
        { status: 403 }
      )
    }
    if (!resolved.station) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    const currentStation = resolved.station

    // Delete dependent questions
    await supabaseAdmin.from('questions').delete().eq('station_id', currentStation.id)

    // Delete station criteria
    await supabaseAdmin.from('station_criteria').delete().eq('station_id', currentStation.id)

    // Delete station
    const { error: delErr } = await supabaseAdmin
      .from('stations')
      .delete()
      .eq('id', currentStation.id)

    if (delErr) throw delErr

    return NextResponse.json({ success: true, message: 'Station deleted successfully.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete station.' },
      { status: 500 }
    )
  }
}
