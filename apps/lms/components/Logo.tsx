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

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which logo to show based on theme
  const isDark = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches))

  // Get logo source - only use defaults if we've confirmed no custom branding exists
  const getLogoSrc = (): string | null => {
    // If data is still loading, return null to show placeholder
    if (brandSettings.isLoading || !brandSettings.hasData) {
      return null
    }

    if (variant === "icon") {
      // Mobile header icon variant - use favicon
      return brandSettings.favicon || null
    }
    // Full logo variant (default) - use logo based on theme
    const customLogo = isDark ? brandSettings.logoWhite : brandSettings.logoBlack
    return customLogo || null
  }

  const logoSrc = getLogoSrc()
  const platformName = brandSettings.platformName || ""

  // Handle image load error
  const handleImageError = () => {
    if (!imageError) {
      setImageError(true)
    }
  }

  // Reset error when logo source changes
  useEffect(() => {
    setImageError(false)
  }, [logoSrc])

  // Show placeholder/skeleton while loading or if no logo available
  if (!mounted || brandSettings.isLoading || !brandSettings.hasData || !logoSrc || imageError) {
    return (
      <div 
        className={cn("flex items-center animate-pulse bg-muted rounded", className)} 
        style={{ 
          minHeight: variant === "icon" ? "32px" : "40px", 
          minWidth: variant === "icon" ? "32px" : "120px",
          height: variant === "icon" ? "32px" : "40px",
          width: variant === "icon" ? "32px" : "120px"
        }} 
      />
    )
  }

  if (variant === "icon") {
    return (
      <Link href="/" className={cn("flex items-center", className)}>
        <Image
          src={logoSrc}
          alt={`${platformName || "Platform"} Logo`}
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
        src={logoSrc}
        alt={`${platformName || "Platform"} Logo`}
        width={120}
        height={40}
        className="h-auto w-auto object-contain"
        priority
        onError={handleImageError}
      />
    </Link>
  )
}
