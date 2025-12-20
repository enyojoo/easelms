import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, name, userType = "user" } = await request.json()

  // Validate and sanitize userType to ensure it's either "user" or "admin"
  let validatedUserType = "user"
  if (typeof userType === "string") {
    const trimmed = userType.trim().toLowerCase()
    if (trimmed === "user" || trimmed === "admin") {
      validatedUserType = trimmed
    } else {
      console.warn(`Invalid userType "${userType}" in signup, defaulting to "user"`)
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
    console.warn("Service role key not available for signup, using regular client:", serviceError.message)
    serviceClient = null
  }

  const clientToUse = serviceClient || supabase

  console.log("Signup: Creating profile with user_type:", profileData.user_type)

  const { error: profileError } = await clientToUse.from("profiles").insert(profileData)

  if (profileError) {
    console.error("Error creating profile:", profileError)
    // Note: We can't easily rollback the auth user without admin privileges
    // The user will need to contact support if this happens
    return NextResponse.json(
      { error: "Failed to create user profile. Please contact support." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    user: authData.user,
    session: authData.session,
  })
}

