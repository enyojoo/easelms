"use client"

import { useEffect } from "react"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"

/**
 * Client-side component that updates the browser title when SEO data changes
 * This ensures the title updates immediately without requiring a page refresh
 */
export default function DynamicTitle() {
  const brandSettings = useBrandSettings()

  useEffect(() => {
    if (typeof document !== "undefined") {
      const title = brandSettings.seoTitle || `${brandSettings.platformName} - Learning Management System`
      document.title = title
    }
  }, [brandSettings.seoTitle, brandSettings.platformName])

  return null
}
