"use client"

import { useEffect } from "react"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"

/**
 * Client-side component that updates favicon links when brand settings change
 * This ensures the favicon updates immediately without requiring a page refresh
 */
export default function DynamicFavicon() {
  const brandSettings = useBrandSettings()

  useEffect(() => {
    if (typeof document === "undefined" || !brandSettings.favicon) return

    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    existingLinks.forEach(link => link.remove())

    // Create new favicon links
    const sizes = [
      { size: "512x512", rel: "icon" },
      { size: "192x192", rel: "icon" },
      { size: "32x32", rel: "icon" },
      { size: "16x16", rel: "icon" },
      { size: "180x180", rel: "apple-touch-icon" },
      { size: "152x152", rel: "apple-touch-icon" },
      { size: "120x120", rel: "apple-touch-icon" },
    ]

    sizes.forEach(({ size, rel }) => {
      const link = document.createElement("link")
      link.rel = rel
      link.href = brandSettings.favicon
      link.sizes = size
      link.type = "image/png"
      document.head.appendChild(link)
    })

    // Add shortcut icon
    const shortcutLink = document.createElement("link")
    shortcutLink.rel = "shortcut icon"
    shortcutLink.href = brandSettings.favicon
    document.head.appendChild(shortcutLink)
  }, [brandSettings.favicon])

  return null
}
