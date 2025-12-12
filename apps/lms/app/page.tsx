import { redirect } from "next/navigation"

export default function AppRootPage() {
  // Always redirect to learner login
  redirect("/auth/learner/login")
}
