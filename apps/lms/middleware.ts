import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  // This middleware is only for the LMS app (app folder)
  // The website folder has its own deployment and doesn't need this middleware
  
  // If accessing root, redirect to user login
  if (url.pathname === "/") {
    url.pathname = "/auth/user/login"
    return NextResponse.redirect(url)
  }

  // Allow access to auth routes, user routes, admin routes, and shared routes
  const allowedPaths = [
    "/auth",
    "/user",
    "/admin",
    "/forgot-password",
    "/logout",
    "/support",
  ]

  const isAllowed = allowedPaths.some((path) => url.pathname.startsWith(path))

  if (!isAllowed && url.pathname !== "/") {
    // Redirect unknown routes to user login
    url.pathname = "/auth/user/login"
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
