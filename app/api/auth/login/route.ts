import { NextRequest, NextResponse } from 'next/server'
import { authenticateUserCredentials, signAuthToken, getRedirectPath } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Institutional email and password are required.' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const authResult = await authenticateUserCredentials(cleanEmail, password)

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Invalid credentials or inactive account.' },
        { status: 401 }
      )
    }

    const user = authResult.user
    const token = signAuthToken(user)
    
    // Check for next_destination cookie intent
    const nextDestination = req.cookies.get('next_destination')?.value
    let finalRedirect = getRedirectPath(user.role)

    if (nextDestination) {
      if (user.role === 'superadmin' && (nextDestination.startsWith('/superadmin') || nextDestination.startsWith('/dean'))) {
        finalRedirect = nextDestination
      } else if (user.role === 'dean' && nextDestination.startsWith('/dean')) {
        finalRedirect = nextDestination
      }
    }

    // Omit sensitive hash from payload
    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      faculty_id: user.faculty_id,
      firstName: user.first_name,
      lastName: user.last_name,
    }

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      redirectUrl: finalRedirect,
    })

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'ecos_auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    })

    // Delete next_destination cookie after consuming
    if (nextDestination) {
      response.cookies.delete('next_destination')
    }

    return response
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server authentication error.' },
      { status: 500 }
    )
  }
}
