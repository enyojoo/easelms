"use client"

import { useRouter } from "next/navigation"

export function logout(userType?: "user" | "admin") {
  // Clear the authentication cookie
  document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"

  // Redirect to appropriate login page
  if (userType === "admin") {
    window.location.href = "/auth/admin/login"
  } else {
    window.location.href = "/auth/user/login"
  }
}

