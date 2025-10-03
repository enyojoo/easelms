"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getClientAuthState } from "./utils/client-auth"

export default function HomePage() {
  const router = useRouter()
  const { isLoggedIn } = getClientAuthState()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login")
    } else {
      router.push("/dash")
    }
  }, [isLoggedIn, router])

  return null // This component doesn't render anything
}
