import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'

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

    const body = await req.json()
    const { title, station_number, access_pin, invigilator_prof_id, exam_id } = body

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
      updatePayload.invigilator_prof_id =
        invigilator_prof_id && invigilator_prof_id !== 'unassigned' && invigilator_prof_id !== 'null'
          ? invigilator_prof_id
          : null
    }

    if (exam_id !== undefined) {
      updatePayload.exam_id =
        exam_id && exam_id !== 'unassigned' && exam_id !== 'null' ? exam_id : null
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
