import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Handle CORS for API routes (website accessing LMS APIs)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow specific website URL or all origins for development
    const allowedOrigin = process.env.NEXT_PUBLIC_WEBSITE_URL || '*'

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Add CORS headers to API responses
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return response
  }
  const url = request.nextUrl.clone()

  // Always redirect root to learner login first
  if (url.pathname === "/") {
    url.pathname = "/auth/learner/login"
    return NextResponse.redirect(url)
  }

  // Use Supabase session check with error handling
  let supabaseResponse
  try {
    supabaseResponse = await updateSession(request)
  } catch (error) {
    // If updateSession fails, still handle the request
    console.error("Middleware error in updateSession:", error)
    // For other routes, allow through (will be handled by page-level auth)
    return NextResponse.next()
  }
  
  // If updateSession redirected, return that redirect
  if (supabaseResponse.status === 307 || supabaseResponse.status === 308) {
    return supabaseResponse
  }

  // Allow access to auth routes, forgot-password, and support without authentication
  const publicPaths = [
    "/auth",
    "/forgot-password",
  ]

  const isPublicPath = publicPaths.some((path) => url.pathname.startsWith(path))

  if (isPublicPath) {
    return supabaseResponse
  }

  // For protected routes, check user type via API
  // The updateSession already checked if user exists, so we just need to verify user type
  // This will be handled by individual page components or we can add it here
  
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths including API routes for CORS handling
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
