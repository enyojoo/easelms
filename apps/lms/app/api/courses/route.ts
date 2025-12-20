import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const recommended = searchParams.get("recommended") === "true"
  const ids = searchParams.get("ids")

  let query = supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)

  if (ids) {
    // Filter by specific course IDs
    const courseIds = ids.split(',').map(id => parseInt(id.trim()))
    query = query.in("id", courseIds)
  } else if (recommended) {
    // For recommended courses, we can use various criteria:
    // - Most enrolled courses
    // - Highest rated courses
    // - Recently published courses
    // For now, we'll return recently published courses with enrollment count
    query = query
      .select(`
        *,
        enrollments (count)
      `)
      .order("created_at", { ascending: false })
      .limit(4)
  } else {
    query = query.order("created_at", { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ courses: data || [] })
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

  const courseData = await request.json()

  const { data, error } = await supabase
    .from("courses")
    .insert({
      ...courseData,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ course: data })
}

