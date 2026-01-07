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
    if (typeof document !== "undefined" && hasData) {
      // Only update title once we have data from database
      // This prevents default title from showing
      const title = brandSettings.seoTitle || `${brandSettings.platformName} - Learning Management System`
      
      // Only update if title actually changed and we've initialized
      if (title !== lastTitleRef.current && (title !== document.title || !initialized)) {
        document.title = title
        lastTitleRef.current = title
        setInitialized(true)
      }
    }
  }, [brandSettings.seoTitle, brandSettings.platformName, hasData, initialized])

  return null
}
