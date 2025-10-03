"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear the authentication cookie
    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"

    // Redirect to the home page
    router.push("/")
  }, [router])

  return <div>Logging out...</div>
}
