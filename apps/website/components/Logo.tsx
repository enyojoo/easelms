"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useBrandSettings } from "@/lib/hooks/useBrandSettings"
import { useTheme } from "./ThemeProvider"

interface LogoProps {
  className?: string
  variant?: "full" | "icon"
}

export default function Logo({ className = "", variant = "full" }: LogoProps) {
  const [mounted, setMounted] = useState(false)
  const [imageError, setImageError] = useState(false)
  const brandSettings = useBrandSettings()
  const { theme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which logo to show based on theme
  const isDark = theme === "dark" || (theme === "system" && mounted && window.matchMedia("(prefers-color-scheme: dark)").matches)

  // Get logo source from brand settings
  const getLogoSrc = (): string => {
    if (variant === "icon") {
      // Mobile header icon variant - use favicon
      return brandSettings.favicon || (isDark ? brandSettings.logoWhite : brandSettings.logoBlack)
    }
    // Full logo variant (default) - use logo based on theme
    return isDark ? brandSettings.logoWhite : brandSettings.logoBlack
  }

  const logoSrc = getLogoSrc()
  const platformName = brandSettings.platformName

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

  // Show placeholder/skeleton while loading or if error
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
