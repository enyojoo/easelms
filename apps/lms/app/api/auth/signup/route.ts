import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, name, userType = "learner" } = await request.json()

  const supabase = await createClient()

  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        user_type: userType,
      },
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }

  // Create profile
  const profileData = {
    id: authData.user.id,
    email,
    name,
    user_type: userType,
    currency: "USD", // All users get USD as default currency
    bio: "",
  }

  const { error: profileError } = await supabase.from("profiles").insert(profileData)

  if (profileError) {
    // Rollback: delete the auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: "Failed to create user profile" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    user: authData.user,
    session: authData.session,
  })
}

