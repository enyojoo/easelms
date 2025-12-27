import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient() // For user authentication
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get("courseId")

  // Use service role client to bypass RLS policies for reading
  const serviceSupabase = createServiceRoleClient()

  let query = serviceSupabase
    .from("progress")
    .select("*")
    .eq("user_id", user.id)

  if (courseId) {
    query = query.eq("course_id", courseId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Progress API GET: Supabase error", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ progress: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient() // For user authentication
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const progressData = await request.json()

  console.log("Progress API POST: Received data", progressData, "for user", user.id)

  // Use service role client for upsert to bypass RLS policies
  const serviceSupabase = createServiceRoleClient()

  const { data, error } = await serviceSupabase
    .from("progress")
    .upsert({
      ...progressData,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error("Progress API POST: Supabase error", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ progress: data })
}

