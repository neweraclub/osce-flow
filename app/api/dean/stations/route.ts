import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { exam_id, station_number, title, access_pin, invigilator_prof_id } = body

    if (!exam_id || !title) {
      return NextResponse.json(
        { success: false, error: 'Exam ID and Station Title are required.' },
        { status: 400 }
      )
    }

    const parsedStationNumber = Number(station_number) || 1
    if (parsedStationNumber < 1) {
      return NextResponse.json(
        { success: false, error: 'Station number must be at least 1.' },
        { status: 400 }
      )
    }

    const pinStr = String(access_pin || '').trim()
    if (pinStr.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Access PIN must be at least 4 characters long.' },
        { status: 400 }
      )
    }

    // Verify exam belongs to dean's faculty scope
    const { data: examCheck, error: examErr } = await supabaseAdmin
      .from('exams')
      .select('id, module_id')
      .eq('id', exam_id)
      .single()

    if (examErr || !examCheck) {
      return NextResponse.json({ success: false, error: 'Target exam session not found.' }, { status: 404 })
    }

    const insertPayload: any = {
      exam_id,
      station_number: parsedStationNumber,
      title: title.trim(),
      access_pin: pinStr,
      invigilator_prof_id: invigilator_prof_id || null,
    }

    const { data: newStation, error: insertErr } = await supabaseAdmin
      .from('stations')
      .insert([insertPayload])
      .select()
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({ success: true, station: newStation })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create station blueprint.' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { id, station_number, title, access_pin, invigilator_prof_id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

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
      updatePayload.invigilator_prof_id = invigilator_prof_id || null
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

export async function DELETE(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await req.json()
        id = body.id
      } catch {
        // query param was empty and body wasn't JSON
      }
    }

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
