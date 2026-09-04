import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    // Select users with role professor in this faculty
    const { data: profUsers, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, is_active, created_at')
      .eq('faculty_id', dean.facultyId)
      .eq('role', 'professor')
      .order('created_at', { ascending: false })

    if (userErr) throw userErr

    const userIds = (profUsers || []).map((u) => u.id)
    let professorsList: any[] = []

    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from('professors')
        .select('*')
        .in('user_id', userIds)

      professorsList = profs || []
    }

    const profByUserId = new Map(professorsList.map((p) => [p.user_id, p]))

    const formattedProfessors = (profUsers || []).map((u) => {
      const p = profByUserId.get(u.id)
      return {
        id: p ? p.id : u.id,
        user_id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        is_active: u.is_active,
        created_at: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A',
      }
    })

    return NextResponse.json({ success: true, professors: formattedProfessors })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch professors.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { first_name, last_name, email, password } = body

    if (!first_name || !last_name || !email) {
      return NextResponse.json({ success: false, error: 'First name, last name, and email are required.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Check for existing user email
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .single()

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User account with this email already exists.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password || 'ProfEcos2026!', 10)

    // 1. Create User
    const { data: newUser, error: createErr } = await supabaseAdmin
      .from('users')
      .insert([
        {
          email: cleanEmail,
          password_hash: passwordHash,
          role: 'professor',
          faculty_id: dean.facultyId,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          is_active: true,
        },
      ])
      .select()
      .single()

    if (createErr) throw createErr

    // 2. Create Professor record
    const { data: newProf, error: profErr } = await supabaseAdmin
      .from('professors')
      .insert([
        {
          user_id: newUser.id,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
        },
      ])
      .select()
      .single()

    if (profErr) throw profErr

    return NextResponse.json({ success: true, professor: newProf })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to register professor.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('user_id')

    if (!id && !userId) {
      return NextResponse.json({ success: false, error: 'Professor ID is required.' }, { status: 400 })
    }

    if (id) {
      await supabaseAdmin.from('professors').delete().eq('id', id)
    }

    if (userId) {
      await supabaseAdmin.from('users').delete().eq('id', userId).eq('faculty_id', dean.facultyId)
    }

    return NextResponse.json({ success: true, message: 'Professor account removed.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to remove professor.' }, { status: 500 })
  }
}
