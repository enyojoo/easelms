"use client"

import Image from "next/image"
import { useTheme } from "./ThemeProvider"
import { useEffect, useState } from "react"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"
import { PLATFORM_DEFAULTS } from "@/lib/config/platform-defaults"

interface PoweredByEaseLMSProps {
  className?: string
}

export default function PoweredByEaseLMS({ className = "" }: PoweredByEaseLMSProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const brandSettings = useBrandSettings()
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if credits are enabled (default to true for open-source)
  // Controlled by platform_settings.credits_enabled
  const creditsEnabled = brandSettings.creditsEnabled !== undefined 
    ? brandSettings.creditsEnabled 
    : PLATFORM_DEFAULTS.credits.enabled

  if (!creditsEnabled || !mounted) {
    return null
  }

  // Determine which logo to show based on theme
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const logoSrc = isDark ? PLATFORM_DEFAULTS.credits.poweredByWhite : PLATFORM_DEFAULTS.credits.poweredByBlack

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <a
        href="https://www.easelms.org"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-60 hover:opacity-100 transition-opacity"
        title="Powered by EaseLMS - Open Source Learning Management System"
      >
        <Image
          src={logoSrc}
          alt="Powered by EaseLMS"
          width={120}
          height={20}
          className="h-auto w-auto object-contain"
        />
      </a>
    </div>
  )
}
