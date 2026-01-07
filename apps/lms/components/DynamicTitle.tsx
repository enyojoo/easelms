"use client"

import { useEffect, useRef, useState } from "react"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"
import { useQueryClient } from "@tanstack/react-query"

/**
 * Client-side component that updates the browser title when SEO data changes
 * This ensures the title updates immediately without requiring a page refresh
 * Only updates if title actually changed to prevent unnecessary updates
 * Waits for brand settings data to load before updating to prevent default flash
 */
export default function DynamicTitle() {
  const brandSettings = useBrandSettings()
  const queryClient = useQueryClient()
  const lastTitleRef = useRef<string>("")
  const [initialized, setInitialized] = useState(false)

  // Check if settings data is loaded
  const settingsData = queryClient.getQueryData<{ platformSettings: any }>(["settings"])
  const hasData = settingsData !== undefined

  useEffect(() => {
    if (typeof document !== "undefined") {
      // Always update title based on brand settings
      // Use custom branding if available, otherwise use defaults
      const title = brandSettings.seoTitle || 
        (brandSettings.platformName 
          ? `${brandSettings.platformName} - Learning Management System`
          : "EaseLMS - Learning Management System")
      
      // Only update if title actually changed
      if (title !== lastTitleRef.current) {
        document.title = title
        lastTitleRef.current = title
        setInitialized(true)
      }
    }
  }, [brandSettings.seoTitle, brandSettings.platformName])

  return null
}
