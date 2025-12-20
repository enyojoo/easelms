"use client"

import { useState } from "react"
import Image from "next/image"

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

  if (!isLoggedIn || !user) {
    return null
  }

  // Extract first name from full name - ensure we have a valid name
  const userName = user.name || ""
  const firstName = userName.split(" ")[0] || userName || "User"
  
  // Debug: log if name is missing
  if (!userName) {
    console.warn("Header: user.name is missing", { user, userType })
  }

  const showImage = user.profileImage && user.profileImage.trim() !== "" && !imageError

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-10 bg-background-element/80 backdrop-blur-md border-b border-border">
      <div className="px-6 py-3">
        <div className="flex items-center justify-end space-x-6">
          <nav className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {showImage ? (
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
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="font-medium">{firstName}</span>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
