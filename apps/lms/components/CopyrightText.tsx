"use client"

import { useState, useEffect } from "react"
import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"
import { useQueryClient } from "@tanstack/react-query"

export default function CopyrightText() {
  const brandSettings = useBrandSettings()
  
  // Only show platform name if we've confirmed data from database
  // If still loading, show placeholder
  if (brandSettings.isLoading || !brandSettings.hasData) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()}
      </p>
    )
  }
  
  // Show platform name only if we have it (either custom or default after confirmation)
  const platformName = brandSettings.platformName || ""
  
  return (
    <p className="text-xs text-muted-foreground text-center">
      © {new Date().getFullYear()}{platformName ? ` ${platformName}` : ""}
    </p>
  )
}
