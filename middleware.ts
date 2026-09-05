import { NextResponse, type NextRequest } from 'next/server'

// Edge-compatible JWT payload decoder & validator
function decodeJWTPayload(token: string): {
  id?: string
  email?: string
  role?: string
  exp?: number
} | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function getRoleDashboard(role?: string): string {
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('ecos_auth_token')?.value
  const payload = token ? decodeJWTPayload(token) : null
  const isValidSession = Boolean(payload && payload.role && (!payload.exp || Date.now() < payload.exp * 1000))

  // 1. Intercept /login when already authenticated -> Redirect to role dashboard
  if (pathname === '/login') {
    if (isValidSession && payload?.role) {
      const targetDashboard = getRoleDashboard(payload.role)
      if (targetDashboard !== '/login') {
        return NextResponse.redirect(new URL(targetDashboard, request.url))
      }
    }
    return NextResponse.next()
  }

  // 2. Protect /superadmin routes
  if (pathname.startsWith('/superadmin')) {
    if (!isValidSession || !payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      if (token) response.cookies.delete('ecos_auth_token')
      response.cookies.set({
        name: 'next_destination',
        value: pathname,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 300, // 5 minutes
      })
      return response
    }

    if (payload.role === 'superadmin') {
      return NextResponse.next()
    }

    const targetDashboard = getRoleDashboard(payload.role)
    return NextResponse.redirect(new URL(targetDashboard, request.url))
  }

  // 3. Protect /dean routes
  if (pathname.startsWith('/dean')) {
    if (!isValidSession || !payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      if (token) response.cookies.delete('ecos_auth_token')
      response.cookies.set({
        name: 'next_destination',
        value: pathname,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 300, // 5 minutes
      })
      return response
    }

    if (payload.role === 'dean' || payload.role === 'superadmin') {
      return NextResponse.next()
    }

    const targetDashboard = getRoleDashboard(payload.role)
    return NextResponse.redirect(new URL(targetDashboard, request.url))
  }

  // 4. Protect /professor and /prof routes
  if (pathname.startsWith('/professor') || pathname.startsWith('/prof')) {
    if (!isValidSession || !payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      if (token) response.cookies.delete('ecos_auth_token')
      response.cookies.set({
        name: 'next_destination',
        value: pathname,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 300,
      })
      return response
    }

    if (payload.role === 'professor' || payload.role === 'dean' || payload.role === 'superadmin') {
      return NextResponse.next()
    }

    const targetDashboard = getRoleDashboard(payload.role)
    return NextResponse.redirect(new URL(targetDashboard, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/superadmin/:path*',
    '/superadmin',
    '/dean/:path*',
    '/dean',
    '/professor/:path*',
    '/professor',
    '/prof/:path*',
    '/prof',
    '/login',
  ],
}
