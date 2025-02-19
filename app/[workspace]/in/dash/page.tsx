import { notFound } from "next/navigation"
import InstructorDashboard from "@/app/components/dash/InstructorDashboard"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export default async function InstructorDashboardPage({ params }: { params: { workspace: string } }) {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return notFound()
  }

  // Fetch the workspace details
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("url_name", params.workspace)
    .single()

  if (error || !workspace) {
    return notFound()
  }

  // Check if the user is an instructor or admin for this workspace
  const { data: role } = await supabase
    .from("workspace_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("workspace_id", workspace.id)
    .single()

  if (!role || (role.role !== "instructor" && role.role !== "admin")) {
    return notFound()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Instructor Dashboard</h1>
      <InstructorDashboard workspaceName={params.workspace} />
    </div>
  )
}

