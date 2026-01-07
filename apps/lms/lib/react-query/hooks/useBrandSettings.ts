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
// Only shows defaults on first load when no data exists
// Once data is loaded, always uses cached values to prevent flickering
export function useBrandSettings(): BrandSettings {
  const { data } = useQuery<{ platformSettings: PlatformSettings | null }>({
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
  
  // Only use defaults if we have no cached data at all (first load)
  // Once data exists in cache, always prefer cached values (even if null/undefined)
  const hasCachedData = data !== undefined
  
  // Helper function to get value - only uses defaults if no cached data exists
  const getValue = <T,>(dbValue: T | null | undefined, defaultValue: T): T => {
    // If we have cached data, always use it (even if null/undefined)
    // This ensures defaults never appear after first load
    if (hasCachedData) {
      // If dbValue is null/undefined, return it as-is (don't use defaults)
      // Components should handle null/undefined appropriately
      return (dbValue ?? defaultValue) as T
    }
    // No cached data - use defaults on first load only
    return defaultValue
  }

  return {
    platformName: getValue(platformSettings?.platform_name, DEFAULT_BRAND_SETTINGS.platformName),
    platformDescription: getValue(platformSettings?.platform_description, DEFAULT_BRAND_SETTINGS.platformDescription),
    logoBlack: getValue(platformSettings?.logo_black, DEFAULT_BRAND_SETTINGS.logoBlack),
    logoWhite: getValue(platformSettings?.logo_white, DEFAULT_BRAND_SETTINGS.logoWhite),
    favicon: getValue(platformSettings?.favicon, DEFAULT_BRAND_SETTINGS.favicon),
    seoTitle: platformSettings?.seo_title,
    seoDescription: platformSettings?.seo_description,
    seoKeywords: platformSettings?.seo_keywords,
    seoImage: platformSettings?.seo_image,
  }
}
