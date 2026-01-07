"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useTheme } from "./ThemeProvider"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"

interface LogoProps {
  className?: string
  variant?: "full" | "icon"
}

export default function Logo({ className = "", variant = "full" }: LogoProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const brandSettings = useBrandSettings()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which logo to show based on theme
  const isDark = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches))

  if (variant === "icon") {
    // Mobile header icon variant - use favicon
    const logoSrc = brandSettings.favicon

    return (
      <Link href="/" className={cn("flex items-center", className)}>
        {mounted && (
          <Image
            src={logoSrc}
            alt={`${brandSettings.platformName} Logo`}
            width={32}
            height={32}
            className="h-auto w-auto object-contain"
            priority
          />
        )}
      </Link>
    )
  }

  // Full logo variant (default) - use logo based on theme
  const logoSrc = isDark ? brandSettings.logoWhite : brandSettings.logoBlack

  return (
    <Link href="/" className={cn("flex items-center", className)}>
      {mounted && (
        <Image
          src={logoSrc}
          alt={`${brandSettings.platformName} Logo`}
          width={120}
          height={40}
          className="h-auto w-auto object-contain"
          priority
        />
      )}
    </Link>
  )
}
