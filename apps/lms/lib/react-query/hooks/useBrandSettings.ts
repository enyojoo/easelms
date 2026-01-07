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
  isLoading: boolean
  hasData: boolean
}

// Hook to get brand settings with defaults
// NEVER shows defaults while loading - only shows defaults when confirmed no brand settings exist
export function useBrandSettings(): BrandSettings & { isLoading: boolean; hasData: boolean } {
  const { data, isPending } = useQuery<{ platformSettings: PlatformSettings | null }>({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        // Try public brand settings endpoint first (works on auth pages)
        const publicResponse = await fetch("/api/brand-settings")
        if (publicResponse.ok) {
          return await publicResponse.json()
        }
        // Fallback to authenticated endpoint if public fails
        const response = await fetch("/api/settings")
        if (!response.ok) {
          return { platformSettings: null }
        }
        return response.json()
      } catch (error) {
        // If fetch fails, return null to indicate no data
        return { platformSettings: null }
      }
    },
    staleTime: Infinity, // Never consider data stale - brand settings don't change often
    gcTime: Infinity, // Keep cache forever - once loaded, always use it
    placeholderData: (previousData) => previousData, // Always use cached data if available
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  })

  const platformSettings = data?.platformSettings
  
  // Check if we have confirmed data (even if null - null means confirmed no brand settings)
  const hasConfirmedData = data !== undefined
  const isLoading = isPending && !hasConfirmedData
  
  // Check if ANY custom brand setting has been set
  // Only check this if we have confirmed data
  const hasCustomBranding = hasConfirmedData && platformSettings && !!(
    platformSettings.platform_name ||
    platformSettings.logo_black ||
    platformSettings.logo_white ||
    platformSettings.favicon ||
    platformSettings.seo_title ||
    platformSettings.seo_description ||
    platformSettings.seo_keywords ||
    platformSettings.seo_image
  )
  
  // Helper to get value: NEVER return defaults while loading
  // Only return defaults when confirmed no brand settings exist
  const getValue = (customValue: string | null | undefined, defaultValue: string): string => {
    // If still loading, return empty string (components will handle this)
    if (isLoading) {
      return ""
    }
    
    // If we have confirmed data and custom branding exists, use custom value
    if (hasCustomBranding && customValue) {
      return customValue
    }
    
    // Only return defaults if we've confirmed no brand settings exist
    if (hasConfirmedData && !hasCustomBranding) {
      return defaultValue
    }
    
    // Still loading or no confirmed data - return empty
    return ""
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
    isLoading,
    hasData: hasConfirmedData,
  }
}
