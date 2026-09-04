import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken, supabaseAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ecos_auth_token')?.value
    if (!token) {
      return NextResponse.json({ authenticated: false })
    }

    const payload = verifyAuthToken(token)
    if (!payload) {
      return NextResponse.json({ authenticated: false })
    }

    let facultyName = 'Central Command'
    if (payload.role === 'superadmin') {
      facultyName = 'Algerian Medical Faculties • Central Command'
    } else if (payload.faculty_id) {
      try {
        const { data: faculty } = await supabaseAdmin
          .from('faculties')
          .select('name')
          .eq('id', payload.faculty_id)
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

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        faculty_id: payload.faculty_id,
        facultyName,
        firstName: payload.firstName || '',
        lastName: payload.lastName || '',
      },
    })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
