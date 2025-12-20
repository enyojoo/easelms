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
  const search = searchParams.get("search")
  const enrollmentFilter = searchParams.get("enrollmentFilter") // "all" | "enrolled" | "not-enrolled"

  // Build query for learners (users with user_type = 'user')
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

