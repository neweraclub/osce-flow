import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifyAuthToken, supabaseAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ecos_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const payload = verifyAuthToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid authentication session.' }, { status: 401 })
    }

    // Fetch user from DB
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, faculty_id, first_name, last_name, is_active')
      .eq('id', payload.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'User account not found.' }, { status: 404 })
    }

    let facultyName: string | null = null
    if (user.faculty_id) {
      const { data: faculty } = await supabaseAdmin
        .from('faculties')
        .select('name')
        .eq('id', user.faculty_id)
        .single()

      if (faculty) {
        facultyName = faculty.name
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        facultyId: user.faculty_id,
        facultyName: user.role === 'superadmin' ? 'Central Administration Hub' : facultyName || 'Medical Faculty',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('ecos_auth_token')?.value
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const payload = verifyAuthToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid authentication session.' }, { status: 401 })
    }

    const body = await req.json()
    const { type } = body

    // 1. UPDATE INSTITUTIONAL EMAIL
    if (type === 'email') {
      const { email } = body
      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return NextResponse.json({ success: false, error: 'Please provide a valid institutional email address.' }, { status: 400 })
      }

      const cleanEmail = email.trim().toLowerCase()

      // Check uniqueness
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .neq('id', payload.id)
        .single()

      if (existingUser) {
        return NextResponse.json({ success: false, error: 'This institutional email is already assigned to another account.' }, { status: 400 })
      }

      // Update email
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ email: cleanEmail, updated_at: new Date().toISOString() })
        .eq('id', payload.id)

      if (updateError) {
        return NextResponse.json({ success: false, error: 'Failed to update email address in database.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Institutional email updated successfully.' })
    }

    // 2. UPDATE SECURITY PASSWORD
    if (type === 'password') {
      const { current_password, new_password } = body

      if (!current_password || !new_password) {
        return NextResponse.json({ success: false, error: 'Current password and new password are required.' }, { status: 400 })
      }

      // Fetch stored password hash
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('password_hash')
        .eq('id', payload.id)
        .single()

      if (userError || !user) {
        return NextResponse.json({ success: false, error: 'User record not found.' }, { status: 404 })
      }

      // Verify current password
      const isMatch = await bcrypt.compare(current_password, user.password_hash)
      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Current password does not match stored records.' }, { status: 400 })
      }

      // Enforce strict password complexity
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/
      if (!passwordRegex.test(new_password)) {
        return NextResponse.json(
          {
            success: false,
            error: 'New password must contain at least 8 characters, including upper and lowercase letters, a number, and a special character.',
          },
          { status: 400 }
        )
      }

      // Hash and update
      const newHash = await bcrypt.hash(new_password, 10)
      const { error: passUpdateError } = await supabaseAdmin
        .from('users')
        .update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq('id', payload.id)

      if (passUpdateError) {
        return NextResponse.json({ success: false, error: 'Failed to update password in database.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Password updated successfully.' })
    }

    return NextResponse.json({ success: false, error: 'Invalid update request type.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal server error.' }, { status: 500 })
  }
}
