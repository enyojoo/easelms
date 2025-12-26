import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // First get the course
  const { data: courseData, error: courseError } = await supabase
    .from("courses")
    .select(`
      *,
      lessons (
        *,
        resources (*),
        quiz_questions (*)
      )
    `)
    .eq("id", params.id)
    .single()

  if (courseError) {
    return NextResponse.json({ error: courseError.message }, { status: 500 })
  }

  // Then get the creator's profile if created_by exists
  let creator = null
  if (courseData?.created_by) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, profile_image, bio, user_type")
      .eq("id", courseData.created_by)
      .single()
    
    if (!profileError && profileData) {
      creator = profileData
    }
  }

  const data = {
    ...courseData,
    creator
  }

  return NextResponse.json({ course: data })
}

export async function PUT(
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

  const courseData = await request.json()

  const { data, error } = await supabase
    .from("courses")
    .update(courseData)
    .eq("id", params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ course: data })
}

export async function DELETE(
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

  // Delete course (cascade should handle related data like lessons, quizzes, etc.)
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Course deleted successfully" })
}
