"use client"

import { useState, useEffect } from "react"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"
import { useQueryClient } from "@tanstack/react-query"

export default function CopyrightText() {
  const brandSettings = useBrandSettings()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [initialized, setInitialized] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Check if settings data is loaded
  const settingsData = queryClient.getQueryData<{ platformSettings: any }>(["settings"])
  const hasData = settingsData !== undefined
  
  // Initialize once we have data (similar to DynamicTitle)
  useEffect(() => {
    if (hasData && !initialized) {
      setInitialized(true)
    }
  }, [hasData, initialized])
  
  // Wait for data before showing platform name to prevent default flash
  // Show year immediately to prevent layout shift
  // This matches the behavior of DynamicTitle - wait for data before rendering custom values
  if (!mounted || !hasData || !initialized) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()}
      </p>
    )
  }
  
  return (
    <p className="text-xs text-muted-foreground text-center">
      © {new Date().getFullYear()} {brandSettings.platformName}
    </p>
  )
}
