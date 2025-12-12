import { redirect } from "next/navigation"

export default function AppRootPage() {
  // Always redirect to user login
  redirect("/auth/user/login")
}
