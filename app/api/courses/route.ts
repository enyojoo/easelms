import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const { data, error } = await supabaseServer.from("courses").select("*")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ courses: data })
}

export async function POST(request: Request) {
  const { title, description, instructor_id } = await request.json()

  const { data, error } = await supabaseServer.from("courses").insert({ title, description, instructor_id }).select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ course: data[0] })
}

