import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, fullName, workspaceSubdomain } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  // Sign up the learner
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        is_learner: true,
      },
    },
  })

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: "User creation failed" }, { status: 500 })
  }

  // Fetch the workspace data
  const { data: workspaceData, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("subdomain", workspaceSubdomain)
    .single()

  if (workspaceError) {
    return NextResponse.json({ error: "Error fetching workspace" }, { status: 500 })
  }

  // Associate the learner with the workspace
  const { error: associationError } = await supabase.from("workspace_users").insert({
    user_id: authData.user.id,
    workspace_id: workspaceData.id,
    role: "learner",
  })

  if (associationError) {
    return NextResponse.json({ error: "Error associating user with workspace" }, { status: 500 })
  }

  return NextResponse.json({
    user: authData.user,
    workspace: workspaceSubdomain,
    session: authData.session,
  })
}

