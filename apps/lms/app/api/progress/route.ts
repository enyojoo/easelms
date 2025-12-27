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

  // Check if progress record already exists
  const { data: existingProgress } = await serviceSupabase
    .from("progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", progressData.lesson_id)
    .single()

  let data, error

  if (existingProgress) {
    // Update existing record
    const { data: updatedData, error: updateError } = await serviceSupabase
      .from("progress")
      .update({
        ...progressData,
        user_id: user.id,
      })
      .eq("user_id", user.id)
      .eq("lesson_id", progressData.lesson_id)
      .select()
      .single()
    
    data = updatedData
    error = updateError
  } else {
    // Insert new record
    const { data: insertedData, error: insertError } = await serviceSupabase
      .from("progress")
      .insert({
        ...progressData,
        user_id: user.id,
      })
      .select()
      .single()
    
    data = insertedData
    error = insertError
  }

  if (error) {
    console.error("Progress API POST: Supabase error", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ progress: data })
}

