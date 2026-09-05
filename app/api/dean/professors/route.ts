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

export async function PUT(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { id, user_id, first_name, last_name, email, is_active, password } = body

    if (!id && !user_id) {
      return NextResponse.json({ success: false, error: 'Professor ID or User ID is required.' }, { status: 400 })
    }

    // Resolve user_id and professor record
    let targetUserId = user_id
    let targetProfId = id

    if (!targetUserId && targetProfId) {
      const { data: prof } = await supabaseAdmin
        .from('professors')
        .select('id, user_id')
        .eq('id', targetProfId)
        .single()
      if (prof) {
        targetUserId = prof.user_id
      }
    }

    if (!targetProfId && targetUserId) {
      const { data: prof } = await supabaseAdmin
        .from('professors')
        .select('id, user_id')
        .eq('user_id', targetUserId)
        .single()
      if (prof) {
        targetProfId = prof.id
      }
    }

    // Verify user belongs to dean's faculty
    const { data: existingUser, error: findErr } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, is_active')
      .eq('id', targetUserId)
      .eq('faculty_id', dean.facultyId)
      .single()

    if (findErr || !existingUser) {
      return NextResponse.json({ success: false, error: 'Professor account not found in this faculty.' }, { status: 404 })
    }

    // If email is changing, ensure it's not taken by another user
    if (email) {
      const cleanEmail = email.trim().toLowerCase()
      if (cleanEmail !== existingUser.email) {
        const { data: emailConflict } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', cleanEmail)
          .neq('id', targetUserId)
          .single()

        if (emailConflict) {
          return NextResponse.json({ success: false, error: 'Another account already uses this institutional email.' }, { status: 400 })
        }
      }
    }

    // Prepare User update payload
    const userUpdatePayload: any = {
      updated_at: new Date().toISOString(),
    }
    if (first_name !== undefined) userUpdatePayload.first_name = first_name.trim()
    if (last_name !== undefined) userUpdatePayload.last_name = last_name.trim()
    if (email !== undefined) userUpdatePayload.email = email.trim().toLowerCase()
    if (is_active !== undefined) userUpdatePayload.is_active = Boolean(is_active)

    if (password && typeof password === 'string' && password.trim().length > 0) {
      userUpdatePayload.password_hash = await bcrypt.hash(password.trim(), 10)
    }

    // 1. Update public.users
    const { data: updatedUser, error: userUpdateErr } = await supabaseAdmin
      .from('users')
      .update(userUpdatePayload)
      .eq('id', targetUserId)
      .eq('faculty_id', dean.facultyId)
      .select()
      .single()

    if (userUpdateErr) throw userUpdateErr

    // 2. Update public.professors
    const profUpdatePayload: any = {}
    if (first_name !== undefined) profUpdatePayload.first_name = first_name.trim()
    if (last_name !== undefined) profUpdatePayload.last_name = last_name.trim()

    let updatedProf = null
    if (targetProfId && Object.keys(profUpdatePayload).length > 0) {
      const { data: p, error: profUpdateErr } = await supabaseAdmin
        .from('professors')
        .update(profUpdatePayload)
        .eq('id', targetProfId)
        .select()
        .single()

      if (profUpdateErr) throw profUpdateErr
      updatedProf = p
    } else if (targetUserId && Object.keys(profUpdatePayload).length > 0) {
      const { data: p } = await supabaseAdmin
        .from('professors')
        .update(profUpdatePayload)
        .eq('user_id', targetUserId)
        .select()
        .single()
      updatedProf = p
    }

    const unifiedProfessor = {
      id: updatedProf?.id || targetProfId || targetUserId,
      user_id: targetUserId,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      email: updatedUser.email,
      is_active: updatedUser.is_active,
    }

    return NextResponse.json({ success: true, professor: unifiedProfessor })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update professor.' }, { status: 500 })
  }
}

export const PATCH = PUT

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
