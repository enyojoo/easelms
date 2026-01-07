"use client"

import { useBrandSettings } from "@/lib/react-query/hooks/useBrandSettings"

export default function CopyrightText() {
  const brandSettings = useBrandSettings()
  
  return (
    <p className="text-xs text-muted-foreground text-center">
      © {new Date().getFullYear()} {brandSettings.platformName}
    </p>
  )
}
