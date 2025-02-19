"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Header from "./Header"
import LeftSidebar from "./LeftSidebar"
import MobileMenu from "./MobileMenu"
import { ThemeProvider } from "./ThemeProvider"
import { PageTransition } from "./PageTransition"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function ClientLayout({
  children,
  session,
}: {
  children: React.ReactNode
  session: any
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState("learner")
  const [workspace, setWorkspace] = useState("")

  useEffect(() => {
    const supabase = createClientComponentClient()

    if (session?.user) {
      setUser(session.user)
      setIsLoggedIn(true)
      setUserType(session.user.user_metadata?.userType || "learner")
      setWorkspace(session.user.user_metadata?.workspace || "")
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        setIsLoggedIn(true)
        setUserType(session.user.user_metadata?.userType || "learner")
        setWorkspace(session.user.user_metadata?.workspace || "")
      } else {
        setUser(null)
        setIsLoggedIn(false)
        setUserType("learner")
        setWorkspace("")
        router.push("/login")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, session])

  // Check if current path is an auth page or a session page
  const isAuthPage = [
    "/login",
    "/signup",
    "/forgot-password",
    "/forgot-password/code",
    "/forgot-password/new-password",
  ].includes(pathname)
  const isSessionPage = pathname.startsWith("/studio/session/")

  return (
    <ThemeProvider defaultTheme="system" storageKey="easner-theme">
      {isLoggedIn && !isAuthPage && !isSessionPage ? (
        <div className="flex flex-col h-screen">
          <div className="lg:hidden">
            <MobileMenu userType={userType} user={user} workspace={workspace} />
          </div>
          <div className="hidden lg:flex h-screen">
            <LeftSidebar userType={userType} workspace={workspace} />
            <div className="flex flex-col flex-grow lg:ml-64">
              <Header isLoggedIn={isLoggedIn} userType={userType} user={user} workspace={workspace} />
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

