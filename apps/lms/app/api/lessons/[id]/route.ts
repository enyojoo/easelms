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

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select(`
      *,
      resources (*),
      quiz_questions (*),
      courses (
        id,
        title,
        settings
      )
    `)
    .eq("id", params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
  }

  // Check if user is enrolled in the course (for learners)
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (profile?.user_type === "user") {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("status")
      .eq("user_id", user.id)
      .eq("course_id", lesson.course_id)
      .single()

    if (!enrollment) {
      return NextResponse.json(
        { error: "You must be enrolled in this course to access lessons" },
        { status: 403 }
      )
    }
  }

  return NextResponse.json({ lesson })
}

