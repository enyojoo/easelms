import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, fullName } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  // Get the current user's workspace
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: workspaceData, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single()

  if (workspaceError) {
    return NextResponse.json({ error: "Error fetching workspace" }, { status: 500 })
  }

  // Invite the instructor
  const { data, error } = await supabase.rpc("invite_instructor_to_workspace", {
    p_email: email,
    p_full_name: fullName,
    p_workspace_id: workspaceData.id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, invitedUserId: data })
}

