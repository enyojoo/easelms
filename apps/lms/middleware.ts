import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Use Supabase session check
  const supabaseResponse = await updateSession(request)
  
  // If updateSession redirected, return that redirect
  if (supabaseResponse.status === 307 || supabaseResponse.status === 308) {
    return supabaseResponse
  }

  const url = request.nextUrl.clone()

  // If accessing root, redirect to learner login
  if (url.pathname === "/") {
    url.pathname = "/auth/learner/login"
    return NextResponse.redirect(url)
  }

  // Allow access to auth routes, forgot-password, and support without authentication
  const publicPaths = [
    "/auth",
    "/forgot-password",
    "/support",
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
