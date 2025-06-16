import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, extractToken, hasRole, createAuthHeaders } from '@/lib/auth-utils'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/api/watchlist',
  '/api/errors', 
  '/api/monitoring'
]

// Routes that require admin access
const ADMIN_ROUTES = [
  '/api/errors',
  '/api/monitoring',
  '/api/admin'
]

// Routes that are public (no auth required)
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/health-check',
  '/api/auth/login',
  '/api/auth/register',
  '/api/trending',
  '/api/seasonal',
  '/api/anilist',
  '/api/jikan'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if route requires authentication
  const requiresAuth = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const requiresAdmin = ADMIN_ROUTES.some(route => pathname.startsWith(route))

  if (!requiresAuth) {
    return NextResponse.next()
  }

  // Extract and verify JWT token
  const token = extractToken(request)
  
  if (!token) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication required',
        message: 'No authentication token provided' 
      }, 
      { status: 401 }
    )
  }

  try {
    // Verify the JWT token
    const user = await verifyJWT(token)
    
    // Check admin access if required
    if (requiresAdmin && !hasRole(user.role, 'admin')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient permissions',
          message: 'Admin access required' 
        }, 
        { status: 403 }
      )
    }

    // Create response with user information in headers
    const response = NextResponse.next()
    const authHeaders = createAuthHeaders(user)
    
    // Add user information to request headers for route handlers
    Object.entries(authHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response

  } catch (error) {
    console.error('JWT verification failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid authentication',
        message: 'Authentication token is invalid or expired' 
      }, 
      { status: 401 }
    )
  }
}

export const config = {
  matcher: [
    '/api/:path*'
  ]
}