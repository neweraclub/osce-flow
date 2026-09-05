import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

export type AppRole = 'superadmin' | 'dean' | 'professor'

export interface JWTPayload {
  id: string
  email: string
  role: AppRole
  faculty_id: string | null
  firstName: string
  lastName: string
  iat?: number
  exp?: number
}

export interface UserRecord {
  id: string
  faculty_id: string | null
  email: string
  password_hash: string
  role: AppRole
  is_active: boolean
  first_name: string
  last_name: string
  created_at: string
  updated_at: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'new-era-ecos-secret-key-2026-medical-algeria'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_service_key'

// Initialize Supabase Client for authentication lookup
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Validates user credentials against PostgreSQL public.users database table.
 */
export async function authenticateUserCredentials(emailInput: string, passwordInput: string): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
  try {
    const cleanEmail = emailInput.trim().toLowerCase()

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .single()

    if (error || !user) {
      return { success: false, error: 'Invalid email or password.' }
    }

    if (!user.is_active) {
      return { success: false, error: 'Account has been deactivated. Contact platform administrator.' }
    }

    // Verify bcrypt hash
    const passwordValid = await bcrypt.compare(passwordInput, user.password_hash)
    if (!passwordValid) {
      return { success: false, error: 'Invalid email or password.' }
    }

    return { success: true, user: user as UserRecord }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Authentication error.' }
  }
}

/**
 * Signs a JWT token containing the required payload structure.
 */
export function signAuthToken(user: UserRecord): string {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    faculty_id: user.faculty_id,
    firstName: user.first_name,
    lastName: user.last_name,
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })
}

/**
 * Verifies and decodes a signed JWT token.
 */
export function verifyAuthToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Maps role to its corresponding dynamic redirect path.
 */
export function getRedirectPath(role: AppRole): string {
  switch (role) {
    case 'superadmin':
      return '/superadmin'
    case 'dean':
      return '/dean'
    case 'professor':
      return '/professor/dashboard'
    default:
      return '/login'
  }
}

