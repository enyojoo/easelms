import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const { title, content, course_id, order_index } = await request.json()

  const { data, error } = await supabaseServer
    .from("lessons")
    .insert({ title, content, course_id, order_index })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ lesson: data[0] })
}

