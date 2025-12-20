import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public paths that don't require authentication
  const publicPaths = ['/auth', '/forgot-password', '/support']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (
    !user &&
    !isPublicPath &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname !== '/'
  ) {
    // no user, redirect to appropriate login page based on route
    const url = request.nextUrl.clone()
    
    // Admin routes redirect to admin login
    if (request.nextUrl.pathname.startsWith('/admin')) {
      url.pathname = '/auth/admin/login'
    } else {
      // All other protected routes (learner routes) redirect to learner login
      url.pathname = '/auth/learner/login'
    }
    
    return NextResponse.redirect(url)
  }

  // If user is logged in, check user type and protect routes
  if (user) {
    // Get user type from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    const userType = profile?.user_type || 'user'
    const url = request.nextUrl.clone()

    // If trying to access auth pages, redirect to appropriate dashboard
    if (request.nextUrl.pathname.startsWith('/auth')) {
      if (userType === 'admin') {
        url.pathname = '/admin/dashboard'
      } else {
        url.pathname = '/learner/dashboard'
      }
      return NextResponse.redirect(url)
    }

    // Protect admin routes - only admins can access
    if (request.nextUrl.pathname.startsWith('/admin') && userType !== 'admin') {
      // Non-admin trying to access admin route, redirect to admin login
      url.pathname = '/auth/admin/login'
      return NextResponse.redirect(url)
    }

    // Protect learner routes - only learners can access (admins can also access learner routes if needed)
    // For now, we allow both admins and learners to access learner routes
    // If you want to restrict admins from learner routes, uncomment below:
    // if (request.nextUrl.pathname.startsWith('/learner') && userType === 'admin') {
    //   url.pathname = '/admin/dashboard'
    //   return NextResponse.redirect(url)
    // }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}

