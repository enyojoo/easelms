import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseServer.from("courses").select("*, lessons(*)").eq("id", params.id).single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ course: data })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { title, description } = await request.json()

  const { data, error } = await supabaseServer
    .from("courses")
    .update({ title, description })
    .eq("id", params.id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ course: data[0] })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { error } = await supabaseServer.from("courses").delete().eq("id", params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: "Course deleted successfully" })
}

