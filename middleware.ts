import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const url = request.nextUrl.clone()

  // Extract subdomain
  const subdomain = hostname.split(".")[0]

  // Handle app subdomain (app.example.com or app.localhost:3000)
  if (subdomain === "app" || hostname.includes("app.localhost")) {
    // If accessing root on app subdomain, redirect to user login
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
    ]

    const isAllowed = allowedPaths.some((path) => url.pathname.startsWith(path))

    if (!isAllowed && url.pathname !== "/") {
      // Redirect unknown routes to user login
      url.pathname = "/auth/user/login"
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  // Handle main domain (example.com or localhost:3000)
  // Allow access to landing page and marketing pages
  if (url.pathname.startsWith("/app")) {
    // If someone tries to access /app/* on main domain, redirect to app subdomain
    // In production, this would redirect to app.example.com
    // For local dev, we'll just allow it for now
    return NextResponse.next()
  }

  // For main domain, serve landing/marketing pages
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

