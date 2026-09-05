import { NextRequest } from 'next/server'
import { verifyAuthToken, supabaseAdmin } from '@/lib/auth'

export interface AuthenticatedProfessor {
  userId: string
  professorId: string
  email: string
  role: string
  facultyId: string
  facultyName: string
  firstName: string
  lastName: string
  fullName: string
}

export async function getAuthenticatedProfessor(req: NextRequest): Promise<AuthenticatedProfessor | null> {
  try {
    const token = req.cookies.get('ecos_auth_token')?.value
    if (!token) return null

    const payload = verifyAuthToken(token)
    if (!payload || !payload.id) return null

    // Fetch user record from users table
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, faculty_id, first_name, last_name, is_active')
      .eq('id', payload.id)
      .single()

    if (userError || !user || !user.is_active) {
      return null
    }

    let targetFacultyId = user.faculty_id

    // Fallback if superadmin / dean tests professor endpoint
    if (!targetFacultyId) {
      const { data: firstFac } = await supabaseAdmin.from('faculties').select('id').limit(1).single()
      targetFacultyId = firstFac?.id || null
    }

    if (!targetFacultyId) return null

    // Fetch faculty details
    const { data: faculty } = await supabaseAdmin
      .from('faculties')
      .select('id, name')
      .eq('id', targetFacultyId)
      .single()

    const facultyName = faculty?.name || 'Medical Faculty'

    // Find or link corresponding professor record
    let { data: professor } = await supabaseAdmin
      .from('professors')
      .select('id, user_id, first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle()

    // If no professor record exists for this user yet, create or auto-link
    if (!professor) {
      const { data: createdProf, error: createErr } = await supabaseAdmin
        .from('professors')
        .insert([
          {
            user_id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
          },
        ])
        .select()
        .single()

      if (!createErr && createdProf) {
        professor = createdProf
      }
    }

    if (!professor) return null

    return {
      userId: user.id,
      professorId: professor.id,
      email: user.email,
      role: user.role,
      facultyId: targetFacultyId,
      facultyName,
      firstName: professor.first_name || user.first_name,
      lastName: professor.last_name || user.last_name,
      fullName: `Prof. ${professor.first_name || user.first_name} ${professor.last_name || user.last_name}`,
    }
  } catch {
    return null
  }
}
