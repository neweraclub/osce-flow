import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin, signAuthToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    // Query assigned modules with study level and academic year
    const { data: modules, error: modErr } = await supabaseAdmin
      .from('modules')
      .select(`
        id,
        module_name,
        level_id,
        study_levels (
          id,
          level_name,
          academic_year_id,
          academic_years (
            id,
            year_label
          )
        )
      `)
      .eq('responsible_prof_id', prof.professorId)
      .order('module_name')

    if (modErr) {
      console.error('Error fetching professor modules:', modErr)
    }

    const assignedModules = (modules || []).map((m: any) => ({
      id: m.id,
      module_name: m.module_name,
      level_name: m.study_levels?.level_name || 'Level Unassigned',
      academic_year: m.study_levels?.academic_years?.year_label || 'Current Academic Cycle',
    }))

    return NextResponse.json({
      success: true,
      profile: {
        userId: prof.userId,
        professorId: prof.professorId,
        firstName: prof.firstName,
        lastName: prof.lastName,
        fullName: prof.fullName,
        email: prof.email,
        role: 'Professor',
        facultyName: prof.facultyName,
      },
      assignedModules,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch professor profile.' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { type } = body

    // 1. UPDATE EMAIL
    if (type === 'email') {
      const { email } = body
      const newEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid institutional email address.' },
          { status: 400 }
        )
      }

      // Check if email already taken
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', newEmail)
        .neq('id', prof.userId)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'This email address is already assigned to another account.' },
          { status: 400 }
        )
      }

      // Update in users table
      const { data: updatedUser, error: updateErr } = await supabaseAdmin
        .from('users')
        .update({ email: newEmail, updated_at: new Date().toISOString() })
        .eq('id', prof.userId)
        .select('*')
        .single()

      if (updateErr || !updatedUser) {
        return NextResponse.json(
          { success: false, error: 'Failed to update email in database.' },
          { status: 500 }
        )
      }

      const response = NextResponse.json({
        success: true,
        message: 'Email updated successfully in database.',
        email: updatedUser.email,
      })

      // Re-sign auth token cookie
      try {
        const token = signAuthToken(updatedUser)
        response.cookies.set({
          name: 'ecos_auth_token',
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 8,
        })
      } catch {
        // Fallback
      }

      return response
    }

    // 2. UPDATE PASSWORD
    if (type === 'password') {
      const { new_password } = body

      if (!new_password || new_password.length < 8) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 8 characters long.' },
          { status: 400 }
        )
      }

      const passwordHash = await bcrypt.hash(new_password, 10)
      const { error: passErr } = await supabaseAdmin
        .from('users')
        .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .eq('id', prof.userId)

      if (passErr) {
        return NextResponse.json(
          { success: false, error: 'Failed to update password in database.' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully.',
      })
    }

    // 3. UPDATE PERSONAL INFO
    if (type === 'personal') {
      const { firstName, lastName } = body
      const first = typeof firstName === 'string' ? firstName.trim() : prof.firstName
      const last = typeof lastName === 'string' ? lastName.trim() : prof.lastName

      if (!first || !last) {
        return NextResponse.json(
          { success: false, error: 'First name and last name are required.' },
          { status: 400 }
        )
      }

      // Update users
      const { data: updatedUser, error: uErr } = await supabaseAdmin
        .from('users')
        .update({ first_name: first, last_name: last, updated_at: new Date().toISOString() })
        .eq('id', prof.userId)
        .select('*')
        .single()

      if (uErr) {
        return NextResponse.json(
          { success: false, error: 'Failed to update user profile.' },
          { status: 500 }
        )
      }

      // Update professors
      await supabaseAdmin
        .from('professors')
        .update({ first_name: first, last_name: last, updated_at: new Date().toISOString() })
        .eq('id', prof.professorId)

      const response = NextResponse.json({
        success: true,
        message: 'Personal information updated successfully.',
        firstName: first,
        lastName: last,
      })

      try {
        const token = signAuthToken(updatedUser)
        response.cookies.set({
          name: 'ecos_auth_token',
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 8,
        })
      } catch {
        // Fallback
      }

      return response
    }

    return NextResponse.json({ success: false, error: 'Invalid update action.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error updating profile.' },
      { status: 500 }
    )
  }
}
