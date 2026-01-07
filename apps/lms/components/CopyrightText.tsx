"use client"

import { useState, useEffect } from "react"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"
import { useQueryClient } from "@tanstack/react-query"

export default function CopyrightText() {
  const brandSettings = useBrandSettings()
  
  // If still loading, show placeholder (NOT default name)
  if (brandSettings.isLoading || !brandSettings.hasData) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()}
      </p>
    )
  }
  
  // Only show platform name if we have confirmed data
  // Only use default if confirmed no brand settings exist
  const platformName = brandSettings.platformName || (brandSettings.hasData ? "" : "EaseLMS")
  
  // If no platform name (empty), just show year
  if (!platformName) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()}
      </p>
    )
  }
  
  return (
    <p className="text-xs text-muted-foreground text-center">
      © {new Date().getFullYear()} {platformName}
    </p>
  )
}
