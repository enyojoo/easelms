import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  // This middleware is only for the LMS app (app folder)
  // The website folder has its own deployment and doesn't need this middleware
  
  // If accessing root, redirect to learner login
  if (url.pathname === "/") {
    url.pathname = "/auth/learner/login"
    return NextResponse.redirect(url)
  }

  // Allow access to auth routes, learner routes, admin routes, and shared routes
  const allowedPaths = [
    "/auth",
    "/learner",
    "/admin",
    "/forgot-password",
    "/logout",
    "/support",
  ]

  const isAllowed = allowedPaths.some((path) => url.pathname.startsWith(path))

  if (!isAllowed && url.pathname !== "/") {
    // Redirect unknown routes to learner login
    url.pathname = "/auth/learner/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
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
