import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken, supabaseAdmin, signAuthToken, UserRecord } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ecos_auth_token')?.value
    if (!token) {
      return NextResponse.json({ authenticated: false })
    }

    const payload = verifyAuthToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ authenticated: false })
    }

    // Always fetch fresh user record from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, faculty_id, first_name, last_name, is_active')
      .eq('id', payload.id)
      .single()

    if (userError || !user || !user.is_active) {
      return NextResponse.json({ authenticated: false })
    }

    let firstName = user.first_name || ''
    let lastName = user.last_name || ''

    // If role is professor, keep users and professors tables synchronized
    if (user.role === 'professor') {
      const { data: prof } = await supabaseAdmin
        .from('professors')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle()

      if (prof) {
        const resolvedFirst = user.first_name || prof.first_name || firstName
        const resolvedLast = user.last_name || prof.last_name || lastName

        firstName = resolvedFirst
        lastName = resolvedLast

        // Keep professors table in sync if divergent (professors table has NO updated_at column)
        if (prof.first_name !== resolvedFirst || prof.last_name !== resolvedLast) {
          await supabaseAdmin
            .from('professors')
            .update({ first_name: resolvedFirst, last_name: resolvedLast })
            .eq('user_id', user.id)
        }

        // Keep users table in sync if divergent
        if (user.first_name !== resolvedFirst || user.last_name !== resolvedLast) {
          await supabaseAdmin
            .from('users')
            .update({ first_name: resolvedFirst, last_name: resolvedLast, updated_at: new Date().toISOString() })
            .eq('id', user.id)
        }
      }
    }

    let facultyName = 'Central Command'
    if (user.role === 'superadmin') {
      facultyName = 'Algerian Medical Faculties • Central Command'
    } else if (user.faculty_id) {
      try {
        const { data: faculty } = await supabaseAdmin
          .from('faculties')
          .select('name')
          .eq('id', user.faculty_id)
          .single()

        if (faculty?.name) {
          facultyName = faculty.name
        } else {
          facultyName = 'Medical Faculty'
        }
      } catch {
        facultyName = 'Medical Faculty'
      }
    }

    const fullName = user.role === 'professor'
      ? `Prof. ${firstName} ${lastName}`.trim()
      : `${firstName} ${lastName}`.trim()

    const response = NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        faculty_id: user.faculty_id,
        facultyName,
        firstName,
        lastName,
        fullName,
      },
    })

    // If cookie token payload is outdated compared to DB, re-sign and refresh cookie
    if (payload.firstName !== firstName || payload.lastName !== lastName || payload.faculty_id !== user.faculty_id) {
      try {
        const freshUser: UserRecord = {
          ...user,
          password_hash: '',
          created_at: '',
          updated_at: '',
          first_name: firstName,
          last_name: lastName,
        }
        const refreshedToken = signAuthToken(freshUser)
        response.cookies.set({
          name: 'ecos_auth_token',
          value: refreshedToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 8,
        })
      } catch (tokenErr) {
        console.warn('Failed to refresh token cookie:', tokenErr)
      }
    }

    return response
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}

