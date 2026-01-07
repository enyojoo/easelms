"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useTheme } from "./ThemeProvider"

/**
 * Brand indicator component
 * This component displays platform branding information
 */
export default function Indicator() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Determine which logo to show based on theme
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  
  const logoSrc = isDark 
    ? "https://cldup.com/-U7IFSEK-m.svg" 
    : "https://cldup.com/rIhf7ALxYw.svg"

  return (
    <div className="flex items-center justify-center mt-2 opacity-60 hover:opacity-80 transition-opacity">
      <Link 
        href="https://www.easelms.org" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center"
      >
        <Image
          src={logoSrc}
          alt="EaseLMS"
          width={120}
          height={20}
          className="h-5 w-auto object-contain"
        />
      </Link>
    </div>
  )
}
