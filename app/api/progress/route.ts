import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const { user_id, lesson_id, completed } = await request.json()

  const { data, error } = await supabaseServer.from("progress").insert({ user_id, lesson_id, completed }).select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ progress: data[0] })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get("user_id")
  const course_id = searchParams.get("course_id")

  if (!user_id || !course_id) {
    return NextResponse.json({ error: "User ID and Course ID are required" }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from("progress")
    .select("*, lessons(*)")
    .eq("user_id", user_id)
    .eq("lessons.course_id", course_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ progress: data })
}

