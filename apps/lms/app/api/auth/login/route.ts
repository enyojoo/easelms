import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, userType } = await request.json()

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  // Verify user type matches
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", data.user.id)
      .single()

    if (profile && profile.user_type !== userType) {
      await supabase.auth.signOut()
      
      // Provide specific error message based on user type
      if (profile.user_type === 'admin' && userType === 'user') {
        return NextResponse.json(
          { error: "Admin accounts cannot login through learner portal. Please use the admin login page." },
          { status: 403 }
        )
      } else if (profile.user_type === 'user' && userType === 'admin') {
        return NextResponse.json(
          { error: "Learner accounts cannot login through admin portal. Please use the learner login page." },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: "Invalid user type for this login" },
        { status: 403 }
      )
    }
  }

  return NextResponse.json({ user: data.user, session: data.session })
}

