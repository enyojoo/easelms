import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Use service role client to bypass RLS when checking admin status
  let serviceClient
  try {
    serviceClient = createServiceRoleClient()
  } catch (serviceError: any) {
    console.warn("Service role key not available, using regular client:", serviceError.message)
    serviceClient = null
  }

  // Try to fetch profile using service role client first (bypasses RLS)
  let profile = null
  let profileError = null

  if (serviceClient) {
    const { data, error: err } = await serviceClient
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()
    
    profile = data
    profileError = err
  } else {
    // Fallback to regular client if service role not available
    const { data, error: err } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()
    
    profile = data
    profileError = err
  }

  if (profileError) {
    console.error("Error fetching profile for admin check:", profileError)
    return NextResponse.json({ error: "Failed to verify admin status" }, { status: 500 })
  }

  // Allow both admin and instructor access
  if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Use service role client for admin queries to bypass RLS
  const adminClient = serviceClient || supabase

  const { data: learner, error } = await adminClient
    .from("profiles")
    .select(`
      *,
      enrollments (
        course_id,
        status,
        progress
      )
    `)
    .eq("id", params.id)
    .eq("user_type", "user")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!learner) {
    return NextResponse.json({ error: "Learner not found" }, { status: 404 })
  }

  // Format learner data
  const formattedLearner = {
    id: learner.id,
    name: learner.name,
    email: learner.email,
    profileImage: learner.profile_image,
    bio: learner.bio,
    currency: learner.currency,
    enrolledCourses: learner.enrollments?.map((e: any) => e.course_id) || [],
    completedCourses: learner.enrollments?.filter((e: any) => e.status === "completed").map((e: any) => e.course_id) || [],
    progress: learner.enrollments?.reduce((acc: any, e: any) => {
      acc[e.course_id] = e.progress || 0
      return acc
    }, {}) || {},
  }

  return NextResponse.json({ learner: formattedLearner })
}

