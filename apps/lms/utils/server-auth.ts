import { createClient } from "@/lib/supabase/server"
import type { UserType } from "../data/users"

export async function getServerAuthState(): Promise<{ isLoggedIn: boolean; userType?: UserType; user?: any }> {
  const supabase = await createClient()
  
  try {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      return { isLoggedIn: false }
    }

    // Fetch user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single()

    if (profileError || !profile) {
      return { isLoggedIn: false }
    }

    // Fetch enrollments and progress
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id, status, progress")
      .eq("user_id", profile.id)

    const enrolledCourseIds = enrollments?.map((e) => e.course_id) || []
    const completedCourseIds = enrollments?.filter((e) => e.status === "completed").map((e) => e.course_id) || []
    const progressMap: Record<number, number> = {}
    enrollments?.forEach((e) => {
      progressMap[e.course_id] = e.progress || 0
    })

    return {
      isLoggedIn: true,
      userType: profile.user_type as UserType,
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        profileImage: profile.profile_image,
        currency: profile.currency || "USD",
        userType: profile.user_type,
        enrolledCourses: enrolledCourseIds,
        completedCourses: completedCourseIds,
        progress: progressMap,
      },
    }
  } catch (error) {
    console.error("Error getting server auth state:", error)
    return { isLoggedIn: false }
  }
}
