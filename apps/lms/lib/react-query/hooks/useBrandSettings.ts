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
// CRITICAL RULE: Never show defaults until we're certain no custom branding exists in database
// Only shows defaults if data is loaded AND confirmed no custom branding exists
export function useBrandSettings(): BrandSettings & { isLoading: boolean } {
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
        // If fetch fails, return null - but we'll wait before showing defaults
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
  
  // Check if we have loaded data (even if null) - this means we've checked the database
  const hasLoadedData = data !== undefined
  
  // CRITICAL: Only show defaults if data is loaded AND we've confirmed no custom branding exists
  // If data is still loading (isPending), don't show defaults yet
  const isLoading = isPending && !hasLoadedData
  
  // Check if ANY custom brand setting has been set
  // This is the key: if custom branding exists, use it instead of defaults
  const hasCustomBranding = hasLoadedData && platformSettings && !!(
    platformSettings.platform_name ||
    platformSettings.logo_black ||
    platformSettings.logo_white ||
    platformSettings.favicon ||
    platformSettings.seo_title ||
    platformSettings.seo_description ||
    platformSettings.seo_keywords ||
    platformSettings.seo_image
  )
  
  // Helper to get value: use custom if set, otherwise use default
  // CRITICAL: Only use defaults if data is loaded and confirmed no custom branding
  const getValue = (customValue: string | null | undefined, defaultValue: string): string => {
    // If still loading, return empty string to prevent default flash
    // Components will check isLoading and show placeholder instead
    if (isLoading) {
      return ""
    }
    
    // If custom branding exists and has value, use it
    if (hasCustomBranding && customValue) {
      return customValue
    }
    
    // Only use defaults if data is loaded and no custom branding exists
    if (hasLoadedData && !hasCustomBranding) {
      return defaultValue
    }
    
    // Still loading or uncertain - return empty to prevent default flash
    return ""
  }
  
  // Return values - components will check isLoading before using defaults
  return {
    platformName: isLoading ? "" : (getValue(platformSettings?.platform_name, DEFAULT_BRAND_SETTINGS.platformName) || DEFAULT_BRAND_SETTINGS.platformName),
    platformDescription: isLoading ? "" : (getValue(platformSettings?.platform_description, DEFAULT_BRAND_SETTINGS.platformDescription) || DEFAULT_BRAND_SETTINGS.platformDescription),
    logoBlack: isLoading ? "" : (getValue(platformSettings?.logo_black, DEFAULT_BRAND_SETTINGS.logoBlack) || DEFAULT_BRAND_SETTINGS.logoBlack),
    logoWhite: isLoading ? "" : (getValue(platformSettings?.logo_white, DEFAULT_BRAND_SETTINGS.logoWhite) || DEFAULT_BRAND_SETTINGS.logoWhite),
    favicon: isLoading ? "" : (getValue(platformSettings?.favicon, DEFAULT_BRAND_SETTINGS.favicon) || DEFAULT_BRAND_SETTINGS.favicon),
    seoTitle: platformSettings?.seo_title || undefined,
    seoDescription: platformSettings?.seo_description || undefined,
    seoKeywords: platformSettings?.seo_keywords || undefined,
    seoImage: platformSettings?.seo_image || undefined,
    isLoading,
  }
}
