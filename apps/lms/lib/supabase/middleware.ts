import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is not configured, just return next response
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
  const publicPaths = ['/auth', '/forgot-password']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // NO ACTIVE SESSION: Redirect to login if accessing protected routes
  if (
    !user &&
    !isPublicPath &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname !== '/'
  ) {
    // No active session - redirect to appropriate login page based on route
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

  // ACTIVE SESSION EXISTS: Allow access to protected routes (with user type checks)
  if (user) {
    // Get user type from profile
    // Try to use service role client to bypass RLS if available
    let profile = null
    try {
      // First try with regular client
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()
      
      if (!error && data) {
        profile = data
      } else {
        // If RLS blocks, try with service role client (only if available)
        try {
          const { createServiceRoleClient } = await import('@/lib/supabase/server')
          const serviceClient = createServiceRoleClient()
          const { data: serviceData } = await serviceClient
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single()
          
          if (serviceData) {
            profile = serviceData
          }
        } catch (serviceError: any) {
          // Service role not available or failed, continue with regular client result
          // This is expected if service role key is not set
        }
      }
    } catch (error) {
      console.error('Error fetching profile in middleware:', error)
    }

    // Determine user type - default to 'user' only if profile fetch completely failed
    // If profile exists but user_type is null/undefined, still default to 'user'
    const userType = profile?.user_type || 'user'
    const url = request.nextUrl.clone()

    // Debug logging (remove in production if needed)
    if (process.env.NODE_ENV === 'development') {
      console.log('Middleware user type check:', {
        userId: user.id,
        userType,
        profileExists: !!profile,
        pathname: request.nextUrl.pathname,
      })
    }

    // If trying to access auth pages, redirect to appropriate dashboard
    if (request.nextUrl.pathname.startsWith('/auth')) {
      // Prevent admins from accessing learner auth pages
      if (request.nextUrl.pathname.startsWith('/auth/learner') && userType === 'admin') {
        url.pathname = '/auth/admin/login'
        return NextResponse.redirect(url)
      }
      
      // Prevent learners from accessing admin auth pages
      if (request.nextUrl.pathname.startsWith('/auth/admin') && userType !== 'admin') {
        url.pathname = '/auth/learner/login'
        return NextResponse.redirect(url)
      }
      
      // If already logged in and accessing correct auth page, redirect to dashboard
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

    // If we reach here, user has active session and proper permissions
    // Allow access to the protected route by returning supabaseResponse
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

