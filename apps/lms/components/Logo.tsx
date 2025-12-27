"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useTheme } from "./ThemeProvider"

interface LogoProps {
  className?: string
  variant?: "full" | "icon"
}

export default function Logo({ className = "", variant = "full" }: LogoProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine which logo to show based on theme
  const isDark = mounted && (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches))

  if (variant === "icon") {
    // Mobile header icon variant
    const logoSrc = isDark
      ? "https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Faviconn.svg"
      : "https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Faviconb.svg"

    return (
      <Link href="/" className={cn("flex items-center", className)}>
        {mounted && (
          <Image
            src={logoSrc}
            alt="Enthronement University Logo"
            width={40}
            height={40}
            className="h-auto w-auto object-contain"
            priority
          />
        )}
      </Link>
    )
  }

  // Full logo variant (default)
  const logoSrc = isDark
    ? "https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20wh.svg"
    : "https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20Bk.svg"

  return (
    <Link href="/" className={cn("flex items-center", className)}>
      {mounted && (
        <Image
          src={logoSrc}
          alt="Enthronement University Logo"
          width={180}
          height={60}
          className="h-auto w-auto object-contain"
          priority
        />
      )}
    </Link>
  )
}
