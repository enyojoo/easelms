import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
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
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
