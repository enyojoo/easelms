import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const { email, password, full_name } = await request.json()

  const { data, error } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user: data.user })
}

