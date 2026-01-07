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
  const [initialized, setInitialized] = useState(false)
  const brandSettings = useBrandSettings()
  const queryClient = useQueryClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if settings data is loaded (similar to CopyrightText)
  const settingsData = queryClient.getQueryData<{ platformSettings: any }>(["settings"])
  const hasData = settingsData !== undefined

  // Initialize once we have data (similar to DynamicTitle and CopyrightText)
  useEffect(() => {
    if (hasData && !initialized) {
      setInitialized(true)
    }
  }, [hasData, initialized])

  // Determine which logo to show based on theme
  const isDark = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches))

  // Wait for data before rendering to prevent default logo flash
  // Show a skeleton placeholder to prevent layout shift
  // Only show placeholder if we don't have data yet
  if (!mounted || !hasData || !initialized) {
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
    // Mobile header icon variant - use favicon
    const logoSrc = brandSettings.favicon

    return (
      <Link href="/" className={cn("flex items-center", className)}>
        <Image
          src={logoSrc}
          alt={`${brandSettings.platformName} Logo`}
          width={32}
          height={32}
          className="h-auto w-auto object-contain"
          priority
        />
      </Link>
    )
  }

  // Full logo variant (default) - use logo based on theme
  const logoSrc = isDark ? brandSettings.logoWhite : brandSettings.logoBlack

  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <Image
        src={logoSrc}
        alt={`${brandSettings.platformName} Logo`}
        width={120}
        height={40}
        className="h-auto w-auto object-contain"
        priority
      />
    </Link>
  )
}
