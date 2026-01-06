import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function POST() {
  const supabase = await createClient()
  
  // Sign out from Supabase (this will clear Supabase session cookies)
  const { error } = await supabase.auth.signOut()

  if (error) {
    logError("Error signing out", error, {
      component: "auth/logout/route",
      action: "POST",
    })
  }

  // Create response
  const response = NextResponse.json({ success: true })

  // Clear auth cookie explicitly
  response.cookies.set("auth", "", {
    expires: new Date(0),
    path: "/",
    maxAge: 0,
  })

  // Clear any Supabase cookies that might remain
  // Supabase SSR handles most of this, but we ensure auth cookie is cleared
  const cookieNames = ["auth"]
  
  cookieNames.forEach((name) => {
    response.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    })
  })

  return response
}

