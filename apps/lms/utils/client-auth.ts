"use client"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { UserType } from "../data/users"

export function useClientAuthState(): { isLoggedIn: boolean; userType?: UserType; user?: any; loading: boolean } {
  const [authState, setAuthState] = useState<{ isLoggedIn: boolean; userType?: UserType; user?: any; loading: boolean }>({
    isLoggedIn: false,
    loading: true,
  })

  useEffect(() => {
    // If Supabase is not configured, use cookie-based auth
    if (!isSupabaseConfigured()) {
      const cookieState = getClientAuthState()
      setAuthState({
        ...cookieState,
        loading: false,
      })
      return
    }

    try {
      const supabase = createClient()

      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          // Fallback to cookies if no Supabase session
          const cookieState = getClientAuthState()
          setAuthState({
            ...cookieState,
            loading: false,
          })
        }
      }).catch(() => {
        // If Supabase fails, fall back to cookies
        const cookieState = getClientAuthState()
        setAuthState({
          ...cookieState,
          loading: false,
        })
      })

      async function fetchUserProfile(userId: string) {
        console.log("useClientAuthState: Fetching profile for user", userId)
        
        // Use API endpoint instead of direct Supabase query to avoid RLS issues
        let profile = null
        let error = null
        
        try {
          const response = await fetch("/api/profile")
          if (response.ok) {
            const data = await response.json()
            profile = data.profile
          } else {
            const errorData = await response.json()
            error = new Error(errorData.error || "Failed to fetch profile")
            console.error("useClientAuthState: API error", errorData)
          }
        } catch (fetchError: any) {
          error = fetchError
          console.error("useClientAuthState: Fetch error", fetchError)
        }

        if (error || !profile) {
          console.warn("useClientAuthState: Profile fetch failed, falling back to cookies", error)
          // Fallback to cookies
          const cookieState = getClientAuthState()
          setAuthState({
            ...cookieState,
            loading: false,
          })
          return
        }

        // Fetch enrollments and progress (handle errors gracefully)
        let enrollments = null
        try {
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from("enrollments")
            .select("course_id, status, progress")
            .eq("user_id", profile.id)
          
          if (!enrollmentsError) {
            enrollments = enrollmentsData
          } else {
            console.warn("useClientAuthState: Error fetching enrollments", enrollmentsError)
          }
        } catch (enrollErr) {
          console.warn("useClientAuthState: Exception fetching enrollments", enrollErr)
        }

        const enrolledCourseIds = enrollments?.map((e) => e.course_id) || []
        const completedCourseIds = enrollments?.filter((e) => e.status === "completed").map((e) => e.course_id) || []
        const progressMap: Record<number, number> = {}
        enrollments?.forEach((e) => {
          progressMap[e.course_id] = e.progress || 0
        })

        const newUser = {
          id: profile.id,
          name: profile.name || "",
          email: profile.email || "",
          profileImage: profile.profile_image || "",
          currency: profile.currency || "USD",
          userType: profile.user_type,
          enrolledCourses: enrolledCourseIds,
          completedCourses: completedCourseIds,
          progress: progressMap,
        }

        console.log("useClientAuthState: Setting new auth state with profile", {
          id: profile.id,
          name: profile.name,
          profile_image: profile.profile_image,
          user_type: profile.user_type,
        })

        setAuthState({
          isLoggedIn: true,
          userType: profile.user_type as UserType,
          user: newUser,
          loading: false,
        })
      }

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          const cookieState = getClientAuthState()
          setAuthState({
            ...cookieState,
            loading: false,
          })
        }
      })

      // Listen for profile updates
      const handleProfileUpdate = async () => {
        console.log("useClientAuthState: profileUpdated event received")
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          console.log("useClientAuthState: Refetching profile for user", session.user.id)
          await fetchUserProfile(session.user.id)
        }
      }

      window.addEventListener("profileUpdated", handleProfileUpdate)

      return () => {
        subscription.unsubscribe()
        window.removeEventListener("profileUpdated", handleProfileUpdate)
      }
    } catch (error) {
      // If Supabase client creation fails, use cookies
      console.warn("Supabase not available, using cookie-based auth:", error)
      const cookieState = getClientAuthState()
      setAuthState({
        ...cookieState,
        loading: false,
      })
    }
  }, [])

  return authState
}

// Legacy function for backward compatibility (uses cookies as fallback)
export function getClientAuthState(): { isLoggedIn: boolean; userType?: UserType; user?: any } {
  if (typeof window === "undefined") {
    return { isLoggedIn: false }
  }

  // Check if Supabase is configured
  const isSupabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // If Supabase is not configured, use cookie-based auth
  if (!isSupabaseConfigured) {
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
            bio: authData.bio,
            currency: authData.currency || "USD",
            enrolledCourses: authData.enrolledCourses || [],
            completedCourses: authData.completedCourses || [],
            progress: authData.progress || {},
          },
        }
      } catch (error) {
        console.error("Error parsing auth cookie:", error)
      }
    }
    return { isLoggedIn: false }
  }

  // Try Supabase (but don't block - this is a sync function)
  // Components should use useClientAuthState hook for proper async Supabase auth
  try {
    const supabase = createClient()
    // Note: This is async but we can't await in a sync function
    // The hook version handles this properly
  } catch (error) {
    // If Supabase fails, fall back to cookies
    console.warn("Supabase client creation failed, falling back to cookies:", error)
  }

  // Fallback to cookie-based auth
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
          enrolledCourses: authData.enrolledCourses || [],
          completedCourses: authData.completedCourses || [],
          progress: authData.progress || {},
        },
      }
    } catch (error) {
      console.error("Error parsing auth cookie:", error)
    }
  }

  return { isLoggedIn: false }
}
