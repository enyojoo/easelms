import { getServerAuthState } from "@/app/utils/server-auth"
import { redirect } from "next/navigation"
import LearnerDashboard from "./LearnerDashboard"

export default function DashboardPage({ params }: { params: { workspace: string } }) {
  const { isLoggedIn, userType } = getServerAuthState()

  if (!isLoggedIn) {
    redirect(`/${params.workspace}/login`)
  }

  if (userType !== "learner") {
    redirect(`/${params.workspace}/in/dash`)
  }

  return <LearnerDashboard workspace={params.workspace} />
}

