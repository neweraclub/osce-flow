import { NextRequest } from 'next/server'
import { verifyAuthToken, supabaseAdmin } from '@/lib/auth'

export interface AuthenticatedDean {
  userId: string
  email: string
  role: string
  facultyId: string
  facultyName: string
  firstName: string
  lastName: string
}

export async function getAuthenticatedDean(req: NextRequest): Promise<AuthenticatedDean | null> {
  try {
    const token = req.cookies.get('ecos_auth_token')?.value
    if (!token) return null

    const payload = verifyAuthToken(token)
    if (!payload || !payload.id) return null

    // Check role (superadmin or dean)
    if (payload.role !== 'dean' && payload.role !== 'superadmin') {
      return null
    }

    // Fetch live user record to get up-to-date faculty_id
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, faculty_id, first_name, last_name, is_active')
      .eq('id', payload.id)
      .single()

    if (userError || !user || !user.is_active) {
      return null
    }

    let targetFacultyId = user.faculty_id

    // If superadmin is accessing, allow query param override or default to first faculty
    if (user.role === 'superadmin' && !targetFacultyId) {
      const urlFacultyId = req.nextUrl.searchParams.get('faculty_id')
      if (urlFacultyId) {
        targetFacultyId = urlFacultyId
      } else {
        const { data: firstFac } = await supabaseAdmin.from('faculties').select('id').limit(1).single()
        targetFacultyId = firstFac?.id || null
      }
    }

    if (!targetFacultyId) return null

    // Fetch medical faculty details
    const { data: faculty, error: facError } = await supabaseAdmin
      .from('faculties')
      .select('id, name')
      .eq('id', targetFacultyId)
      .single()

    if (facError || !faculty) return null

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      facultyId: faculty.id,
      facultyName: faculty.name,
      firstName: user.first_name,
      lastName: user.last_name,
    }
  } catch {
    return null
  }
}
