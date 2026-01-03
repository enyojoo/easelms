import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error("Enrollments API: Auth error", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client to bypass RLS and avoid recursion
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      console.warn("Service role key not available, using regular client:", serviceError.message)
      serviceClient = null
    }

    const clientToUse = serviceClient || supabase

    // Try to fetch enrollments with courses relation first
    let { data, error } = await clientToUse
      .from("enrollments")
      .select(`
        *,
        courses (*)
      `)
      .eq("user_id", user.id)

    // If error with courses relation, try without it (might be RLS issue even with service client)
    if (error) {
      console.warn("Enrollments API: Error with courses relation, trying without:", error.message)
      const { data: enrollmentsData, error: enrollmentsError } = await clientToUse
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
      
      if (!enrollmentsError) {
        data = enrollmentsData
        error = null
      } else {
        console.error("Enrollments API: Database error", {
          error: enrollmentsError,
          code: enrollmentsError.code,
          message: enrollmentsError.message,
          details: enrollmentsError.details,
          hint: enrollmentsError.hint,
          userId: user.id,
        })
        return NextResponse.json({ 
          error: enrollmentsError.message,
          details: enrollmentsError.details,
          hint: enrollmentsError.hint,
        }, { status: 500 })
      }
    }

    if (error) {
      console.error("Enrollments API: Database error", {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: user.id,
      })
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
      }, { status: 500 })
    }

    // Return empty array if no enrollments (not an error)
    return NextResponse.json({ enrollments: data || [] })
  } catch (error: any) {
    console.error("Enrollments API: Unexpected error", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json({ 
      error: error?.message || "An unexpected error occurred while fetching enrollments",
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { courseId, userId } = await request.json()

  // Check if user is admin if userId is provided (admin enrolling another user)
  let targetUserId = user.id
  if (userId && userId !== user.id) {
    // Verify the requesting user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only admins can enroll other users" }, { status: 403 })
    }

    targetUserId = userId
  }

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("enrollments")
    .insert({
      user_id: targetUserId,
      course_id: courseId,
      status: "active",
      progress: 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enrollment: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { courseId, status } = await request.json()

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })
  }

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 })
  }

  // Use service role client to bypass RLS
  const serviceSupabase = createServiceRoleClient()

  const { data, error } = await serviceSupabase
    .from("enrollments")
    .update({
      status: status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .select()
    .single()

  if (error) {
    console.error("Error updating enrollment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enrollment: data })
}
