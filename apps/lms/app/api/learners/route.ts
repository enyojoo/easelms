import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const enrollmentFilter = searchParams.get("enrollmentFilter") // "all" | "enrolled" | "not-enrolled"

  // Build query for learners (users with user_type = 'user')
  let query = adminClient
    .from("profiles")
    .select(`
      *,
      enrollments (
        course_id,
        status,
        progress
      )
    `)
    .eq("user_type", "user")

  // Apply search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: learners, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Process learners data
  let processedLearners = learners?.map((learner) => ({
    id: learner.id,
    name: learner.name,
    email: learner.email,
    profileImage: learner.profile_image,
    enrolledCourses: learner.enrollments?.map((e: any) => e.course_id) || [],
    completedCourses: learner.enrollments?.filter((e: any) => e.status === "completed").map((e: any) => e.course_id) || [],
    progress: learner.enrollments?.reduce((acc: any, e: any) => {
      acc[e.course_id] = e.progress || 0
      return acc
    }, {}) || {},
  })) || []

  // Apply enrollment filter
  if (enrollmentFilter === "enrolled") {
    processedLearners = processedLearners.filter((l) => l.enrolledCourses.length > 0)
  } else if (enrollmentFilter === "not-enrolled") {
    processedLearners = processedLearners.filter((l) => l.enrolledCourses.length === 0)
  }

  return NextResponse.json({ learners: processedLearners })
}

