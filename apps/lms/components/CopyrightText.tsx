"use client"

import { useState, useEffect } from "react"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"
import { useQueryClient } from "@tanstack/react-query"

export default function CopyrightText() {
  const brandSettings = useBrandSettings()
  
  // CRITICAL: Don't show platform name until data is loaded to prevent default flash
  if (brandSettings.isLoading) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()}
      </p>
    )
  }
  
  // Always show platform name - use brand settings or default
  // If custom branding exists but platform name is empty, still show default
  const platformName = brandSettings.platformName || "EaseLMS"
  
  return (
    <p className="text-xs text-muted-foreground text-center">
      © {new Date().getFullYear()} {platformName}
    </p>
  )
}
