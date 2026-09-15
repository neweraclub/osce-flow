import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import {
  verifyStationBelongsToFaculty,
  verifyExamBelongsToFaculty,
  verifyProfessorBelongsToFaculty,
} from '@/lib/facultyScope'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

    // Strict multi-tenancy verification: Station must belong to the Dean's faculty
    const isAllowed = await verifyStationBelongsToFaculty(id, dean.facultyId)
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Station does not belong to your faculty.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { title, station_number, access_pin, invigilator_prof_id, exam_id, weightage_percentage } = body

    const updatePayload: any = {}

    if (station_number !== undefined) {
      const num = Number(station_number)
      if (num < 1) {
        return NextResponse.json({ success: false, error: 'Station number must be >= 1.' }, { status: 400 })
      }
      updatePayload.station_number = num
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ success: false, error: 'Station title cannot be empty.' }, { status: 400 })
      }
      updatePayload.title = title.trim()
    }

    if (access_pin !== undefined) {
      const pinStr = String(access_pin).trim()
      if (pinStr.length < 4) {
        return NextResponse.json({ success: false, error: 'PIN must be at least 4 characters.' }, { status: 400 })
      }
      updatePayload.access_pin = pinStr
    }

    if (invigilator_prof_id !== undefined) {
      if (invigilator_prof_id && invigilator_prof_id !== 'unassigned' && invigilator_prof_id !== 'null') {
        const isProfAllowed = await verifyProfessorBelongsToFaculty(invigilator_prof_id, dean.facultyId)
        if (!isProfAllowed) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Evaluator does not belong to your faculty.' },
            { status: 403 }
          )
        }
        updatePayload.invigilator_prof_id = invigilator_prof_id
      } else {
        updatePayload.invigilator_prof_id = null
      }
    }

    if (exam_id !== undefined) {
      if (!exam_id || exam_id === 'unassigned' || exam_id === 'null') {
        return NextResponse.json(
          { success: false, error: 'Exam ID cannot be empty. Stations must be linked to an exam.' },
          { status: 400 }
        )
      }
      const isExamAllowed = await verifyExamBelongsToFaculty(exam_id, dean.facultyId)
      if (!isExamAllowed) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Target exam does not belong to your faculty.' },
          { status: 403 }
        )
      }
      updatePayload.exam_id = exam_id
    }

    if (weightage_percentage !== undefined) {
      const weightage = Number(weightage_percentage)
      if (isNaN(weightage) || weightage < 0 || weightage > 100) {
        return NextResponse.json(
          { success: false, error: 'Weightage percentage must be between 0 and 100.' },
          { status: 400 }
        )
      }
      updatePayload.weightage_percentage = weightage
    }

    const { data: updatedStation, error: updateErr } = await supabaseAdmin
      .from('stations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, station: updatedStation })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update station.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

    // Strict multi-tenancy verification: Station must belong to the Dean's faculty
    const isAllowed = await verifyStationBelongsToFaculty(id, dean.facultyId)
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Station does not belong to your faculty.' },
        { status: 403 }
      )
    }

    const { error: delErr } = await supabaseAdmin
      .from('stations')
      .delete()
      .eq('id', id)

    if (delErr) throw delErr

    return NextResponse.json({ success: true, message: 'Station deleted successfully.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete station.' },
      { status: 500 }
    )
  }
}

