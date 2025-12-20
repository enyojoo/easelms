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
      if (isSupabase && !supabaseAuthState.loading && supabaseAuthState.user) {
        // Ensure we have the correct user structure from Supabase
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
  }, [isSupabase, supabaseAuthState])

  // Update auth state when pathname changes (in case user logs in/out or navigates)
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      if (isSupabase && !supabaseAuthState.loading && supabaseAuthState.user) {
        // Ensure we have the correct user structure from Supabase
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

  // During SSR and initial render, show children without layout to avoid hydration mismatch
  // After mount, show the proper layout based on auth state
  if (!mounted) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="enthronement-university-theme">
        <PageTransition>{children}</PageTransition>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="enthronement-university-theme">
      {isLoggedIn && !isAuthPage ? (
        <div className="flex flex-col h-screen">
          <div className="lg:hidden">
            <MobileMenu userType={userType || "user"} user={user} />
          </div>
          <div className="hidden lg:flex h-screen">
            <LeftSidebar userType={userType || "user"} />
            <div className="flex flex-col flex-grow lg:ml-64">
              <Header isLoggedIn={isLoggedIn} userType={userType} user={user} />
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
