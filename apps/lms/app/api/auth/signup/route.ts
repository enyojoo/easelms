import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function POST(request: Request) {
  const { email, password, name, userType = "user" } = await request.json()

  // Validate and sanitize userType to ensure it's either "user" or "admin"
  let validatedUserType = "user"
  if (typeof userType === "string") {
    const trimmed = userType.trim().toLowerCase()
    if (trimmed === "user" || trimmed === "admin") {
      validatedUserType = trimmed
    } else {
      logWarning(`Invalid userType "${userType}" in signup, defaulting to "user"`, {
        component: "auth/signup/route",
        action: "POST",
        providedUserType: userType,
      })
    }
  }

  const supabase = await createClient()

  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        user_type: validatedUserType,
      },
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }

  // Create profile using service role client to bypass RLS
  // IMPORTANT: Always use "user" for signup to avoid constraint violations
  // Admin users should be created through the admin endpoint
  const profileData = {
    id: authData.user.id,
    email,
    name,
    user_type: "user", // Always "user" for signup - hardcoded to avoid constraint issues
    currency: "USD", // All users get USD as default currency
    bio: "",
  }

  let serviceClient
  try {
    serviceClient = createServiceRoleClient()
  } catch (serviceError: any) {
    logWarning("Service role key not available for signup, using regular client", {
      component: "auth/signup/route",
      action: "POST",
      error: serviceError.message,
    })
    serviceClient = null
  }

  const clientToUse = serviceClient || supabase

  logInfo("Signup: Creating profile", { userType: profileData.user_type, email })

  const { error: profileError } = await clientToUse.from("profiles").insert(profileData)

  if (profileError) {
    logError("Error creating profile", profileError, {
      component: "auth/signup/route",
      action: "POST",
      userId: authData.user.id,
      email,
    })
    // Note: We can't easily rollback the auth user without admin privileges
    // The user will need to contact support if this happens
    return NextResponse.json(
      { error: "Failed to create user profile. Please contact support." },
      { status: 500 }
    )
  }

  // Send welcome email notification (non-blocking)
  const nameParts = (name || "").split(" ")
  const firstName = nameParts[0] || "User"
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const notificationUrl = new URL("/api/send-email-notification", baseUrl).toString()
    fetch(notificationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "welcome",
        userEmail: email,
        firstName,
      }),
    }).catch((error) => {
      logWarning("Failed to trigger welcome email", {
        component: "auth/signup/route",
        action: "POST",
        email,
        error: error?.message,
      })
    })
  } catch (urlError) {
    logWarning("Failed to construct notification URL", {
      component: "auth/signup/route",
      action: "POST",
      email,
      error: urlError instanceof Error ? urlError.message : String(urlError),
    })
  }

  return NextResponse.json({
    user: authData.user,
    session: authData.session,
  })
}

