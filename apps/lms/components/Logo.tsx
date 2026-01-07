"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useTheme } from "./ThemeProvider"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"
import { useQueryClient } from "@tanstack/react-query"

interface LogoProps {
  className?: string
  variant?: "full" | "icon"
}

export default function Logo({ className = "", variant = "full" }: LogoProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [imageError, setImageError] = useState(false)
  const brandSettings = useBrandSettings()
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which logo to show based on theme
  const isDark = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches))

  // Get logo source - prefer custom, fallback to default if empty or error
  const getLogoSrc = () => {
    if (variant === "icon") {
      // Mobile header icon variant - use favicon
      return brandSettings.favicon || "https://cldup.com/6yEKvPtX22.svg"
    }
    // Full logo variant (default) - use logo based on theme
    const customLogo = isDark ? brandSettings.logoWhite : brandSettings.logoBlack
    // If custom logo exists and is not empty, use it; otherwise use default
    return customLogo || (isDark ? "https://cldup.com/bwlFqC4f8I.svg" : "https://cldup.com/VQGhFU5kd6.svg")
  }

  const logoSrc = getLogoSrc()
  const platformName = brandSettings.platformName || "EaseLMS"

  // Handle image load error - fallback to default
  const handleImageError = () => {
    if (!imageError) {
      setImageError(true)
    }
  }

  // Reset error when logo source changes
  useEffect(() => {
    setImageError(false)
  }, [logoSrc])

  // Use default logo if image error occurred or if custom logo is empty
  const finalLogoSrc = imageError || !logoSrc
    ? (variant === "icon" 
        ? "https://cldup.com/6yEKvPtX22.svg"
        : (isDark ? "https://cldup.com/bwlFqC4f8I.svg" : "https://cldup.com/VQGhFU5kd6.svg"))
    : logoSrc

  if (variant === "icon") {
    return (
      <Link href="/" className={cn("flex items-center", className)}>
        <Image
          src={finalLogoSrc}
          alt={`${platformName} Logo`}
          width={32}
          height={32}
          className="h-auto w-auto object-contain"
          priority
          onError={handleImageError}
        />
      </Link>
    )
  }

  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <Image
        src={finalLogoSrc}
        alt={`${platformName} Logo`}
        width={120}
        height={40}
        className="h-auto w-auto object-contain"
        priority
        onError={handleImageError}
      />
    </Link>
  )
}
