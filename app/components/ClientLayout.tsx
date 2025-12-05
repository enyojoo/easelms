"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Header from "./Header"
import LeftSidebar from "./LeftSidebar"
import MobileMenu from "./MobileMenu"
import { getClientAuthState } from "../utils/client-auth"
import { ThemeProvider } from "./ThemeProvider"
import { PageTransition } from "./PageTransition"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [authState, setAuthState] = useState<{
    isLoggedIn: boolean
    userType?: "user" | "admin"
    user?: any
  }>({ isLoggedIn: false })

  useEffect(() => {
    setMounted(true)
    setAuthState(getClientAuthState())
  }, [])

  // Check if current path is an auth page
  const isAuthPage = [
    "/auth/user/login",
    "/auth/user/signup",
    "/auth/admin/login",
    "/forgot-password",
    "/forgot-password/code",
    "/forgot-password/new-password",
  ].includes(pathname) || pathname.startsWith("/auth/")

  const { isLoggedIn, userType, user } = authState

  // During SSR and initial render, show children without layout to avoid hydration mismatch
  if (!mounted) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="easelms-theme">
        <PageTransition>{children}</PageTransition>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="easelms-theme">
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
