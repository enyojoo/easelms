import { createClient } from "@/lib/supabase/server"
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

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (profile?.user_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: learner, error } = await supabase
    .from("profiles")
    .select(`
      *,
      enrollments (
        course_id,
        status,
        progress,
        created_at
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

