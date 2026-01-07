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
  const lastTitleRef = useRef<string>("")

  useEffect(() => {
    if (typeof document !== "undefined") {
      // Don't update title while loading - wait for confirmed data
      if (brandSettings.isLoading || !brandSettings.hasData) {
        return
      }
      
      // Build title - only use defaults if confirmed no brand settings exist
      let title: string
      if (brandSettings.seoTitle) {
        title = brandSettings.seoTitle
      } else if (brandSettings.platformName) {
        title = `${brandSettings.platformName} - Learning Management System`
      } else {
        // Only use default if confirmed no brand settings exist
        title = brandSettings.hasData ? "Learning Management System" : "EaseLMS - Learning Management System"
      }
      
      // Only update if title actually changed
      if (title !== lastTitleRef.current) {
        document.title = title
        lastTitleRef.current = title
      }
    }
  }, [brandSettings.seoTitle, brandSettings.platformName, brandSettings.isLoading, brandSettings.hasData])

  return null
}
