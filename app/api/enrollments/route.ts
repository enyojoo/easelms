import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const { user_id, course_id } = await request.json()

  const { data, error } = await supabaseServer.from("enrollments").insert({ user_id, course_id }).select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ enrollment: data[0] })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get("user_id")

  if (!user_id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  const { data, error } = await supabaseServer.from("enrollments").select("*, courses(*)").eq("user_id", user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enrollments: data })
}

