import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, workspaceSubdomain } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Fetch the user's data and check if they're associated with the workspace
  const { data: userData, error: userError } = await supabase
    .from("workspace_users")
    .select("workspaces(subdomain)")
    .eq("user_id", data.user.id)
    .eq("workspaces.subdomain", workspaceSubdomain)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: "User not associated with this workspace" }, { status: 403 })
  }

  return NextResponse.json({
    user: data.user,
    workspace: workspaceSubdomain,
    isLearner: true,
    session: data.session,
  })
}

