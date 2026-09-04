import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

// GET: Query all faculties joined with their assigned dean from public.users
export async function GET() {
  try {
    const { data: faculties, error: facError } = await supabaseAdmin
      .from('faculties')
      .select('*')
      .order('created_at', { ascending: false })

    if (facError) {
      throw facError
    }

    // Fetch active deans
    const { data: deans, error: deanError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, faculty_id, is_active')
      .eq('role', 'dean')

    if (deanError) {
      throw deanError
    }

    const deanMap = new Map<string, any>()
    if (deans) {
      deans.forEach((d) => {
        if (d.faculty_id) {
          deanMap.set(d.faculty_id, d)
        }
      })
    }

    const result = (faculties || []).map((f) => {
      const assignedDean = deanMap.get(f.id)
      return {
        id: f.id,
        name: f.name,
        address: f.address || '',
        phone_number: f.phone_number || '',
        created_at: f.created_at ? new Date(f.created_at).toISOString().split('T')[0] : '',
        hasDean: !!assignedDean,
        dean: assignedDean
          ? {
              id: assignedDean.id,
              name: `Prof. ${assignedDean.first_name} ${assignedDean.last_name}`,
              email: assignedDean.email,
              is_active: assignedDean.is_active,
            }
          : null,
      }
    })

    return NextResponse.json({ success: true, faculties: result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch faculties from database.' },
      { status: 500 }
    )
  }
}

// POST: Insert new faculty into public.faculties
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, address, phone_number } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Faculty name is required.' },
        { status: 400 }
      )
    }

    const { data: newFaculty, error } = await supabaseAdmin
      .from('faculties')
      .insert([
        {
          name: name.trim(),
          address: address ? address.trim() : null,
          phone_number: phone_number ? phone_number.trim() : null,
        },
      ])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A faculty with this exact name already exists in database.' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, faculty: newFaculty }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create faculty in database.' },
      { status: 500 }
    )
  }
}

// PUT: Update existing faculty details
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, address, phone_number } = body

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Faculty ID and name are required.' },
        { status: 400 }
      )
    }

    const { data: updated, error } = await supabaseAdmin
      .from('faculties')
      .update({
        name: name.trim(),
        address: address ? address.trim() : null,
        phone_number: phone_number ? phone_number.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, faculty: updated })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update faculty in database.' },
      { status: 500 }
    )
  }
}

// DELETE: Delete faculty from database
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Faculty ID parameter is required.' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('faculties')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: 'Faculty deleted successfully.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete faculty from database.' },
      { status: 500 }
    )
  }
}
