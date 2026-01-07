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

  // If still loading brand settings, show placeholder (NOT default logo)
  if (brandSettings.isLoading || !brandSettings.hasData) {
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

  // Get logo source - only use defaults if confirmed no brand settings exist
  const getLogoSrc = () => {
    if (variant === "icon") {
      // Mobile header icon variant - use favicon
      return brandSettings.favicon || (brandSettings.hasData ? "" : "https://cldup.com/6yEKvPtX22.svg")
    }
    // Full logo variant (default) - use logo based on theme
    const customLogo = isDark ? brandSettings.logoWhite : brandSettings.logoBlack
    // Only use default if confirmed no brand settings exist
    return customLogo || (brandSettings.hasData ? "" : (isDark ? "https://cldup.com/bwlFqC4f8I.svg" : "https://cldup.com/VQGhFU5kd6.svg"))
  }

  const logoSrc = getLogoSrc()
  
  // If no logo source (empty string), show placeholder instead of default
  if (!logoSrc) {
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

  const platformName = brandSettings.platformName || (brandSettings.hasData ? "" : "EaseLMS")

  // Handle image load error - show placeholder instead of default
  const handleImageError = () => {
    if (!imageError) {
      setImageError(true)
    }
  }

  // Reset error when logo source changes
  useEffect(() => {
    setImageError(false)
  }, [logoSrc])

  // If image error, show placeholder (NOT default logo)
  if (imageError) {
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
