"use client"

export async function logout(userType?: "user" | "admin") {
  try {
    // Call the logout API endpoint to sign out from Supabase
    await fetch("/api/auth/logout", {
      method: "POST",
    })
  } catch (error) {
    console.error("Error during logout:", error)
  }

  // Clear the authentication cookie
  document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;"

  // Clear any other auth-related cookies
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=")
    const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim()
    if (name.startsWith("sb-") || name === "auth") {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
    }
  })

  // Redirect to appropriate login page
  if (userType === "admin") {
    window.location.href = "/auth/admin/login"
  } else {
    window.location.href = "/auth/learner/login"
  }
}

