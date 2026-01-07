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
      // Always update title, but prefer data from database if available
      // This ensures title works on auth pages too
      if (hasData) {
        // We have data from database - use custom branding
        const title = brandSettings.seoTitle || `${brandSettings.platformName} - Learning Management System`
        
        // Only update if title actually changed
        if (title !== lastTitleRef.current) {
          document.title = title
          lastTitleRef.current = title
          setInitialized(true)
        }
      } else {
        // No data yet - keep the server-set title (from layout.tsx script tag)
        // Don't update until we have data to prevent default flash
        if (!initialized) {
          // Mark as initialized to prevent unnecessary updates
          setInitialized(true)
        }
      }
    }
  }, [brandSettings.seoTitle, brandSettings.platformName, hasData, initialized])

  return null
}
