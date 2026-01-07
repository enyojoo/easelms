import { useQuery } from "@tanstack/react-query"
import { PlatformSettings } from "./useSettings"

// Default brand settings (only used when no data exists at all)
export const DEFAULT_BRAND_SETTINGS = {
  platformName: "EaseLMS",
  platformDescription: "EaseLMS is a modern, open-source Learning Management System built with modern tech stack. It provides a complete solution for creating, managing, and delivering online courses with features like video lessons, interactive quizzes, progress tracking, certificates, and payment integration.",
  logoBlack: "https://cldup.com/VQGhFU5kd6.svg",
  logoWhite: "https://cldup.com/bwlFqC4f8I.svg",
  favicon: "https://cldup.com/6yEKvPtX22.svg",
}

export interface BrandSettings {
  platformName: string
  platformDescription: string
  logoBlack: string
  logoWhite: string
  favicon: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  seoImage?: string
}

// Hook to get brand settings with defaults
// Only shows defaults if no custom branding has ever been set
// Once custom branding exists, defaults NEVER show again
export function useBrandSettings(): BrandSettings {
  const { data, isPending } = useQuery<{ platformSettings: PlatformSettings | null }>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings")
      if (!response.ok) {
        return { platformSettings: null }
      }
      return response.json()
    },
    staleTime: Infinity, // Never consider data stale - brand settings don't change often
    gcTime: Infinity, // Keep cache forever - once loaded, always use it
    placeholderData: (previousData) => previousData, // Always use cached data if available
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  })

  const platformSettings = data?.platformSettings
  
  // Check if we have cached data (even if null)
  const hasCachedData = data !== undefined
  
  // Check if ANY custom brand setting has been set
  // This is the key: if custom branding exists, NEVER use defaults
  const hasCustomBranding = hasCachedData && platformSettings && !!(
    platformSettings.platform_name ||
    platformSettings.logo_black ||
    platformSettings.logo_white ||
    platformSettings.favicon ||
    platformSettings.seo_title ||
    platformSettings.seo_description ||
    platformSettings.seo_keywords ||
    platformSettings.seo_image
  )
  
  // Helper function to get value - NEVER uses defaults if custom branding exists
  const getValue = <T,>(dbValue: T | null | undefined, defaultValue: T): T => {
    // If custom branding exists, ALWAYS prefer custom values (even if null/undefined)
    // Only fall back to defaults if the field is required and no custom value exists
    if (hasCustomBranding) {
      // Custom branding exists - use custom value, fallback to default only for required fields
      return (dbValue ?? defaultValue) as T
    }
    
    // No custom branding exists yet
    if (hasCachedData) {
      // We have data but no custom branding - use defaults
      // This handles the case where platformSettings is null (no record) or all fields are null
      return defaultValue
    }
    
    // No cached data yet (first load) - use defaults temporarily
    // Once data loads, this will be recalculated
    return defaultValue
  }

  return {
    platformName: getValue(platformSettings?.platform_name, DEFAULT_BRAND_SETTINGS.platformName),
    platformDescription: getValue(platformSettings?.platform_description, DEFAULT_BRAND_SETTINGS.platformDescription),
    logoBlack: getValue(platformSettings?.logo_black, DEFAULT_BRAND_SETTINGS.logoBlack),
    logoWhite: getValue(platformSettings?.logo_white, DEFAULT_BRAND_SETTINGS.logoWhite),
    favicon: getValue(platformSettings?.favicon, DEFAULT_BRAND_SETTINGS.favicon),
    seoTitle: platformSettings?.seo_title || undefined,
    seoDescription: platformSettings?.seo_description || undefined,
    seoKeywords: platformSettings?.seo_keywords || undefined,
    seoImage: platformSettings?.seo_image || undefined,
  }
}
