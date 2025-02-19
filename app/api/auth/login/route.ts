import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) throw signInError

    if (!authData.user) {
      throw new Error("Login failed: No user data returned")
    }

    // Fetch user role and workspace data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, workspace_id")
      .eq("id", authData.user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      throw new Error("Error fetching user data")
    }

    let workspaceData = null
    if (userData.workspace_id) {
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("subdomain")
        .eq("id", userData.workspace_id)
        .single()

      if (workspaceError) {
        console.error("Error fetching workspace data:", workspaceError)
        throw new Error("Error fetching workspace data")
      }
      workspaceData = workspace
    }

    return NextResponse.json({
      user: { ...authData.user, role: userData.role },
      workspace: workspaceData,
      session: authData.session,
    })
  } catch (error) {
    console.error("Login process error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 500 })
  }
}

