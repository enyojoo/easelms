import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (profile?.user_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userType = searchParams.get("userType") // "admin" | "user" | null (all)

  // Build query with enrollments for user type
  let query = supabase
    .from("profiles")
    .select(`
      *,
      enrollments (
        course_id,
        status,
        progress
      )
    `)
    .order("created_at", { ascending: false })

  if (userType) {
    query = query.eq("user_type", userType)
  }

  const { data: users, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Process users to include enrollment counts
  const processedUsers = (users || []).map((user: any) => {
    const enrollments = user.enrollments || []
    const enrolledCourses = enrollments.map((e: any) => e.course_id)
    const completedCourses = enrollments.filter((e: any) => e.status === "completed").map((e: any) => e.course_id)
    
    return {
      ...user,
      enrolledCourses,
      completedCourses,
      enrolledCoursesCount: enrolledCourses.length,
      completedCoursesCount: completedCourses.length,
    }
  })

  return NextResponse.json({ users: processedUsers })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (profile?.user_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { email, password, name, userType } = await request.json()

  if (!email || !password || !name || !userType) {
    return NextResponse.json(
      { error: "Email, password, name, and userType are required" },
      { status: 400 }
    )
  }

  // Validate and sanitize userType to ensure it's either "user" or "admin"
  let validatedUserType = "user"
  if (typeof userType === "string") {
    const trimmed = userType.trim().toLowerCase()
    if (trimmed === "user" || trimmed === "admin") {
      validatedUserType = trimmed
    } else {
      return NextResponse.json(
        { error: `Invalid userType "${userType}". Must be "user" or "admin"` },
        { status: 400 }
      )
    }
  } else {
    return NextResponse.json(
      { error: `userType must be a string. Received: ${typeof userType}` },
      { status: 400 }
    )
  }

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Create profile
  const { data: newProfile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: authUser.user.id,
      email,
      name,
      user_type: validatedUserType,
    })
    .select()
    .single()

  if (profileError) {
    // Rollback: delete auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ user: newProfile }, { status: 201 })
}

