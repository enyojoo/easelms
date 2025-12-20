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
          
          // Check if response is ok
          if (response.ok) {
            try {
              const data = await response.json()
              profile = data.profile
              
              // If profile is null/undefined even though response is ok, treat as error
              if (!profile) {
                error = new Error("Profile data not found in response")
                console.warn("useClientAuthState: Profile not found in response", data)
              }
            } catch (parseError: any) {
              error = new Error("Failed to parse profile response")
              console.error("useClientAuthState: Failed to parse response", {
                status: response.status,
                parseError: parseError.message,
              })
            }
          } else {
            // Response is not ok - try to get error message
            let errorMessage = `HTTP ${response.status}: Failed to fetch profile`
            
            try {
              // Try to read response as text first to see what we're dealing with
              const responseText = await response.text()
              
              if (responseText) {
                try {
                  const errorData = JSON.parse(responseText)
                  // Check if errorData has an error property and it's not empty
                  if (errorData && typeof errorData === 'object') {
                    if (errorData.error && typeof errorData.error === 'string' && errorData.error.trim()) {
                      errorMessage = errorData.error
                    } else if (errorData.message && typeof errorData.message === 'string' && errorData.message.trim()) {
                      errorMessage = errorData.message
                    }
                  }
                } catch (jsonError) {
                  // If it's not valid JSON, use the text as error message if it's not empty
                  if (responseText.trim()) {
                    errorMessage = responseText.trim()
                  }
                }
              }
              
              console.error("useClientAuthState: API error", {
                status: response.status,
                statusText: response.statusText,
                responseText: responseText ? responseText.substring(0, 200) : "(empty response)", // Log first 200 chars
                hasResponseText: !!responseText,
                responseTextLength: responseText?.length || 0,
              })
            } catch (readError: any) {
              // If we can't read the response, use status-based message
              errorMessage = response.statusText || `HTTP ${response.status}: Failed to fetch profile`
              console.error("useClientAuthState: Failed to read error response", {
                status: response.status,
                statusText: response.statusText,
                readError: readError.message,
              })
            }
            
            error = new Error(errorMessage)
          }
        } catch (fetchError: any) {
          error = fetchError
          console.error("useClientAuthState: Fetch error", {
            message: fetchError.message,
            name: fetchError.name,
            stack: fetchError.stack,
          })
        }

        if (error || !profile) {
          // If profile doesn't exist and we got a 500 error, the profile creation failed
          // Don't fall back to cookies - return an error state so the UI can handle it
          if (error && error.message?.includes("constraint") && !profile) {
            console.error("useClientAuthState: Profile creation failed due to database constraint", error)
            setAuthState({
              isLoggedIn: false,
              user: null,
              userType: undefined,
              loading: false,
            })
            return
          }
          
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
