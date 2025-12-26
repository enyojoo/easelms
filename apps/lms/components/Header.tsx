"use client"

import { useState } from "react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"

interface HeaderProps {
  isLoggedIn: boolean
  userType?: "user" | "admin"
  user?: {
    name: string
    profileImage: string
  }
}

export default function Header({ isLoggedIn, userType, user }: HeaderProps) {
  const [imageError, setImageError] = useState(false)

  // Always render header structure, show loading state if user data not available
  const isLoading = !user || !isLoggedIn

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-10 bg-background-element/80 backdrop-blur-md border-b border-border">
      <div className="px-6 py-3">
        <div className="flex items-center justify-end space-x-6">
          <nav className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {isLoading ? (
                <>
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {user.profileImage && user.profileImage.trim() !== "" && !imageError ? (
                      <Image
                        src={user.profileImage}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                        style={{ objectPosition: "center 20%" }}
                        onError={() => {
                          setImageError(true)
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-primary text-primary-foreground text-sm font-semibold">
                        {(user.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="font-medium">
                    {user.name ? user.name.split(" ")[0] : "User"}
                  </span>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
