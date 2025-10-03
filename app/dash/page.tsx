"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getClientAuthState } from "@/app/utils/client-auth"
import LearnerDashboard from "./LearnerDashboard"
import InstructorDashboard from "./InstructorDashboard"

export default function DashboardPage() {
  const router = useRouter()
  const { isLoggedIn, userType } = getClientAuthState()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login")
    }
  }, [isLoggedIn, router])

  if (!isLoggedIn) {
    return null // or a loading indicator
  }

  switch (userType) {
    case "learner":
      return <LearnerDashboard />
    case "instructor":
      return <InstructorDashboard />
    default:
      return <div>Invalid user type</div>
  }
}
