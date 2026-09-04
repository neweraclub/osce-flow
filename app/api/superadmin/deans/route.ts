import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/auth'

// GET: Query all provisioned deans and all faculties for 1:1 constraint dropdown binding
export async function GET() {
  try {
    const [usersRes, facultiesRes] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email, role, faculty_id, is_active, created_at')
        .eq('role', 'dean')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('faculties')
        .select('id, name')
        .order('name', { ascending: true }),
    ])

    if (usersRes.error) throw usersRes.error
    if (facultiesRes.error) throw facultiesRes.error

    const faculties = facultiesRes.data || []
    const deans = usersRes.data || []

    // Map faculty ID to current assigned dean
    const assignedFacultyMap = new Map<string, string>()
    deans.forEach((d) => {
      if (d.faculty_id && d.is_active) {
        assignedFacultyMap.set(d.faculty_id, d.id)
      }
    })

    const facultyMap = new Map(faculties.map((f) => [f.id, f.name]))

    const formattedDeans = deans.map((d) => ({
      id: d.id,
      first_name: d.first_name,
      last_name: d.last_name,
      email: d.email,
      faculty_id: d.faculty_id || '',
      faculty_name: d.faculty_id ? facultyMap.get(d.faculty_id) || 'Unassigned Faculty' : 'Unassigned Faculty',
      is_active: d.is_active,
      created_at: d.created_at ? new Date(d.created_at).toISOString().split('T')[0] : '',
    }))

    const facultyOptions = faculties.map((f) => ({
      id: f.id,
      name: f.name,
      hasDean: assignedFacultyMap.has(f.id),
      currentDeanId: assignedFacultyMap.get(f.id),
    }))

    return NextResponse.json({
      success: true,
      deans: formattedDeans,
      faculties: facultyOptions,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch deans from database.' },
      { status: 500 }
    )
  }
}

// POST: Register new dean user in public.users with hashed password and faculty_id
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { first_name, last_name, email, password, faculty_id } = body

    if (!first_name || !last_name || !email || !faculty_id) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, email, and bound faculty are required.' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()

    // 1:1 Binding Constraint Validation: Check if faculty already has an active Dean
    const { data: existingDean } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'dean')
      .eq('faculty_id', faculty_id)
      .eq('is_active', true)
      .single()

    if (existingDean) {
      return NextResponse.json(
        {
          success: false,
          error: `The selected faculty already has an assigned active Dean (${existingDean.first_name} ${existingDean.last_name}). Please reassign or revoke existing dean first to maintain 1:1 binding.`,
        },
        { status: 400 }
      )
    }

    const rawPassword = password || 'DeanEcos2026!'
    const password_hash = await bcrypt.hash(rawPassword, 10)

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          email: cleanEmail,
          password_hash,
          role: 'dean',
          faculty_id,
          is_active: true,
        },
      ])
      .select('id, first_name, last_name, email, faculty_id, is_active, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A user with this institutional email address already exists.' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, user: newUser }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to provision dean in database.' },
      { status: 500 }
    )
  }
}

// PUT: Update dean details or active status toggle
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, first_name, last_name, email, faculty_id, is_active } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required.' },
        { status: 400 }
      )
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (first_name !== undefined) updates.first_name = first_name.trim()
    if (last_name !== undefined) updates.last_name = last_name.trim()
    if (email !== undefined) updates.email = email.trim().toLowerCase()
    if (is_active !== undefined) updates.is_active = is_active
    if (faculty_id !== undefined) updates.faculty_id = faculty_id

    // If changing faculty, validate 1:1 binding constraint
    if (faculty_id) {
      const { data: existingDean } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'dean')
        .eq('faculty_id', faculty_id)
        .eq('is_active', true)
        .neq('id', id)
        .single()

      if (existingDean) {
        return NextResponse.json(
          { success: false, error: 'Target faculty already has another active assigned Dean.' },
          { status: 400 }
        )
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, first_name, last_name, email, faculty_id, is_active, created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, user: updated })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update dean record in database.' },
      { status: 500 }
    )
  }
}

// DELETE: Revoke/delete dean user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Dean ID parameter is required.' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Dean account revoked successfully.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete dean user from database.' },
      { status: 500 }
    )
  }
}
