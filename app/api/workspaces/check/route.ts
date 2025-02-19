import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name")

  if (!name) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })

  const { data: isAvailable, error } = await supabase.rpc("is_workspace_name_available", { workspace_name: name })

  if (error) {
    return NextResponse.json({ error: "Error checking workspace availability" }, { status: 500 })
  }

  return NextResponse.json({ isAvailable })
}

