import type { UserType } from "../data/users"

export function getClientAuthState(): { isLoggedIn: boolean; userType?: UserType; user?: any } {
  if (typeof window === "undefined") {
    return { isLoggedIn: false }
  }

  const authCookie = document.cookie.split("; ").find((row) => row.startsWith("auth="))
  if (authCookie) {
    try {
      const authData = JSON.parse(decodeURIComponent(authCookie.split("=")[1]))
      return {
        isLoggedIn: true,
        userType: authData.userType,
        user: {
          name: authData.name,
          email: authData.email,
          profileImage: authData.profileImage,
          currency: authData.currency || "USD",
          // Add other necessary user data here
          enrolledCourses: [], // This should be fetched from a database in a real app
          completedCourses: [], // This should be fetched from a database in a real app
          achievements: [], // This should be fetched from a database in a real app
        },
      }
    } catch (error) {
      console.error("Error parsing auth cookie:", error)
    }
  }

  return { isLoggedIn: false }
}
