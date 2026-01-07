"use client"

import { useEffect, useRef } from "react"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"

/**
 * Client-side component that updates the browser title when SEO data changes
 * This ensures the title updates immediately without requiring a page refresh
 * Only updates if title actually changed to prevent unnecessary updates
 */
export default function DynamicTitle() {
  const brandSettings = useBrandSettings()
  const lastTitleRef = useRef<string>("")

  useEffect(() => {
    if (typeof document !== "undefined") {
      const title = brandSettings.seoTitle || `${brandSettings.platformName} - Learning Management System`
      
      // Only update if title actually changed
      if (title !== lastTitleRef.current && title !== document.title) {
        document.title = title
        lastTitleRef.current = title
      }
    }
  }, [brandSettings.seoTitle, brandSettings.platformName])

  return null
}
