"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Header from "./Header"
import LeftSidebar from "./LeftSidebar"
import MobileMenu from "./MobileMenu"
import { getClientAuthState, useClientAuthState } from "../utils/client-auth"
import { ThemeProvider } from "./ThemeProvider"
import { PageTransition } from "./PageTransition"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Use the hook for Supabase auth if configured, otherwise use state
  const supabaseAuthState = useClientAuthState()
  const isSupabase = isSupabaseConfigured()
  
  // Initialize auth state - start with false to match server render
  const [authState, setAuthState] = useState<{ isLoggedIn: boolean; userType?: string; user?: any }>({
    isLoggedIn: false,
  })
  const [mounted, setMounted] = useState(false)

  // Only check auth state on client after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      if (isSupabase) {
        // Check if we have a session even if hook is still loading
        const checkSession = async () => {
          try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session?.user) {
              // If we have a session, use the hook state if available, otherwise fetch profile
              if (!supabaseAuthState.loading && supabaseAuthState.user) {
                setAuthState({
                  isLoggedIn: supabaseAuthState.isLoggedIn,
                  userType: supabaseAuthState.userType,
                  user: {
                    name: supabaseAuthState.user.name || "",
                    profileImage: supabaseAuthState.user.profileImage || "",
                    email: supabaseAuthState.user.email || "",
                    id: supabaseAuthState.user.id,
                  },
                })
              } else {
                // Hook still loading, but we have a session - fetch profile directly
                const profileResponse = await fetch("/api/profile")
                if (profileResponse.ok) {
                  const profileData = await profileResponse.json()
                  if (profileData.profile) {
                    setAuthState({
                      isLoggedIn: true,
                      userType: profileData.profile.user_type,
                      user: {
                        id: profileData.profile.id,
                        name: profileData.profile.name || "",
                        email: profileData.profile.email || "",
                        profileImage: profileData.profile.profile_image || "",
                      },
                    })
                  }
                }
              }
            } else if (!supabaseAuthState.loading) {
              // No session and hook finished loading
              setAuthState({
                isLoggedIn: false,
              })
            }
          } catch (error) {
            console.error("Error checking session:", error)
            // Fallback to hook state or cookies
            if (!supabaseAuthState.loading && supabaseAuthState.user) {
              setAuthState({
                isLoggedIn: supabaseAuthState.isLoggedIn,
                userType: supabaseAuthState.userType,
                user: {
                  name: supabaseAuthState.user.name || "",
                  profileImage: supabaseAuthState.user.profileImage || "",
                  email: supabaseAuthState.user.email || "",
                  id: supabaseAuthState.user.id,
                },
              })
            } else if (!isSupabase) {
              setAuthState(getClientAuthState())
            }
          }
        }
        
        checkSession()
      } else {
        setAuthState(getClientAuthState())
      }
    }
  }, [isSupabase, supabaseAuthState])

  // Update auth state when pathname changes (in case user logs in/out or navigates)
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      if (isSupabase) {
        // Check session on pathname change to catch login/logout
        const checkSession = async () => {
          try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session?.user) {
              if (!supabaseAuthState.loading && supabaseAuthState.user) {
                setAuthState({
                  isLoggedIn: supabaseAuthState.isLoggedIn,
                  userType: supabaseAuthState.userType,
                  user: {
                    name: supabaseAuthState.user.name || "",
                    profileImage: supabaseAuthState.user.profileImage || "",
                    email: supabaseAuthState.user.email || "",
                    id: supabaseAuthState.user.id,
                  },
                })
              } else {
                // Fetch profile if hook hasn't loaded yet
                const profileResponse = await fetch("/api/profile")
                if (profileResponse.ok) {
                  const profileData = await profileResponse.json()
                  if (profileData.profile) {
                    setAuthState({
                      isLoggedIn: true,
                      userType: profileData.profile.user_type,
                      user: {
                        id: profileData.profile.id,
                        name: profileData.profile.name || "",
                        email: profileData.profile.email || "",
                        profileImage: profileData.profile.profile_image || "",
                      },
                    })
                  }
                }
              }
            } else {
              // No session
              setAuthState({
                isLoggedIn: false,
              })
            }
          } catch (error) {
            console.error("Error checking session on pathname change:", error)
            if (!supabaseAuthState.loading && supabaseAuthState.user) {
              setAuthState({
                isLoggedIn: supabaseAuthState.isLoggedIn,
                userType: supabaseAuthState.userType,
                user: {
                  name: supabaseAuthState.user.name || "",
                  profileImage: supabaseAuthState.user.profileImage || "",
                  email: supabaseAuthState.user.email || "",
                  id: supabaseAuthState.user.id,
                },
              })
            }
          }
        }
        
        checkSession()
      } else {
        setAuthState(getClientAuthState())
      }
    }
  }, [pathname, mounted, isSupabase, supabaseAuthState])

  // Listen for profile updates to refresh header
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return

    const handleProfileUpdate = async () => {
      // If using Supabase, refetch profile from database
      if (isSupabase) {
        try {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single()

            if (profile) {
              setAuthState({
                isLoggedIn: true,
                userType: profile.user_type,
                user: {
                  id: profile.id,
                  name: profile.name || "",
                  email: profile.email || "",
                  profileImage: profile.profile_image || "",
                  currency: profile.currency || "USD",
                  userType: profile.user_type,
                },
              })
            }
          }
        } catch (error) {
          console.error("Error refreshing profile:", error)
          // Fallback to cookie-based auth
          setAuthState(getClientAuthState())
        }
      } else {
        // Refresh from cookies
        setAuthState(getClientAuthState())
      }
    }

    window.addEventListener("profileUpdated", handleProfileUpdate)
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate)
    }
  }, [mounted, isSupabase])

  // Check if current path is an auth page
  const isAuthPage = [
    "/auth/learner/login",
    "/auth/learner/signup",
    "/auth/admin/login",
    "/forgot-password",
    "/forgot-password/code",
    "/forgot-password/new-password",
  ].includes(pathname) || pathname.startsWith("/auth/")

  const { isLoggedIn, userType, user } = authState

  // During SSR and initial render, preserve layout structure to avoid layout shift
  // Show loading state with layout structure, then update with auth state after mount
  if (!mounted) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="enthronement-university-theme">
        <div className="flex flex-col h-screen">
          <div className="hidden lg:flex h-screen">
            <div className="w-64 h-screen bg-background-element border-r border-border" />
            <div className="flex flex-col flex-grow lg:ml-64">
              <div className="h-16 border-b border-border" />
              <div className="flex-grow overflow-y-auto lg:pt-16 pb-8">
                <main className="container-fluid">
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
            </div>
          </div>
          <div className="lg:hidden">
            <div className="h-16 border-b border-border" />
          </div>
          <div className="lg:hidden flex-grow overflow-y-auto mt-16 mb-16 pb-4">
            <main className="container-fluid">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  // Determine if we should show the layout
  // Show layout if: logged in and not on auth page, OR if we're on a protected route (to preserve structure during loading)
  const isProtectedRoute = pathname.startsWith('/admin/') || pathname.startsWith('/learner/')
  const shouldShowLayout = (isLoggedIn && !isAuthPage) || (isProtectedRoute && !isAuthPage)

  return (
    <ThemeProvider defaultTheme="system" storageKey="enthronement-university-theme">
      {shouldShowLayout ? (
        <div className="flex flex-col h-screen">
          <div className="lg:hidden">
            {isLoggedIn && user ? (
              <MobileMenu userType={userType || "user"} user={user} />
            ) : (
              <div className="h-16 border-b border-border" />
            )}
          </div>
          <div className="hidden lg:flex h-screen">
            {isLoggedIn && userType ? (
              <LeftSidebar userType={userType || "user"} />
            ) : (
              <div className="w-64 h-screen bg-background-element border-r border-border" />
            )}
            <div className="flex flex-col flex-grow lg:ml-64">
              {isLoggedIn && user ? (
                <Header isLoggedIn={isLoggedIn} userType={userType} user={user} />
              ) : (
                <div className="h-16 border-b border-border" />
              )}
              <div className="flex-grow overflow-y-auto lg:pt-16 pb-8">
                <main className="container-fluid">
                  <PageTransition>{children}</PageTransition>
                </main>
              </div>
            </div>
          </div>
          <div className="lg:hidden flex-grow overflow-y-auto mt-16 mb-16 pb-4">
            <main className="container-fluid">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      ) : (
        <PageTransition>{children}</PageTransition>
      )}
    </ThemeProvider>
  )
}
