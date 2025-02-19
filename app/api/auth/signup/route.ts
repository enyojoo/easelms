import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password, fullName, workspaceName } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Sign up the workspace owner
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          is_workspace_owner: true,
          workspace_name: workspaceName,
        },
      },
    })

    if (signUpError) {
      console.error("Signup error:", signUpError)
      throw signUpError
    }

    if (!authData.user) {
      console.error("User creation failed: No user data returned")
      throw new Error("User creation failed")
    }

    // Wait for a short period to allow the trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Fetch the created workspace
    const { data: workspaceData, error: workspaceError } = await supabase
      .from("workspaces")
      .select("subdomain")
      .eq("owner_id", authData.user.id)
      .single()

    if (workspaceError) {
      console.error("Workspace fetch error:", workspaceError)
      throw new Error("Error fetching workspace data")
    }

    if (!workspaceData) {
      console.error("Workspace creation failed: No workspace data returned")
      throw new Error("Workspace creation failed")
    }

    return NextResponse.json({
      user: authData.user,
      workspace: workspaceData,
      session: authData.session,
    })
  } catch (error) {
    console.error("Signup process error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Signup failed" }, { status: 500 })
  }
}

