import { useQuery } from "@tanstack/react-query"

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

export interface PlatformSettings {
  platform_name?: string | null
  platform_description?: string | null
  logo_black?: string | null
  logo_white?: string | null
  favicon?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  seo_image?: string | null
}

// Hook to get brand settings from LMS
// Fetches brand settings through website API proxy to avoid CORS issues
export function useBrandSettings(): BrandSettings & { isLoading: boolean; hasData: boolean } {
  const { data, isPending } = useQuery<{ platformSettings: PlatformSettings | null }>({
    queryKey: ["brand-settings"],
    queryFn: async () => {
      try {
        // Fetch from website API proxy (which fetches from LMS server-side)
        // This avoids CORS issues when website and LMS are on different domains
        const response = await fetch("/api/brand-settings")

        if (!response.ok) {
          // If API is not available, return null
          return { platformSettings: null }
        }

        return response.json()
      } catch (error) {
        // If fetch fails, return null - this means we've checked and found nothing
        console.warn("Failed to fetch brand settings:", error)
        return { platformSettings: null }
      }
    },
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 30 * 60 * 1000, // Keep cache for 30 minutes
    placeholderData: (previousData) => previousData, // Always use cached data if available
    refetchOnMount: true, // Refetch on mount to ensure fresh data
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch on reconnect
  })

  const platformSettings = data?.platformSettings

  // Check if we have confirmed data from database (even if null)
  // isPending means we're still fetching, so we haven't confirmed yet
  const hasConfirmedData = data !== undefined && !isPending

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

  // Helper to get value:
  // - If data is still loading (not confirmed), return empty string (no defaults)
  // - If custom branding exists, use custom value
  // - If we've confirmed no custom branding exists, use default
  const getValue = (customValue: string | null | undefined, defaultValue: string): string => {
    // If we haven't confirmed data yet, return empty string to prevent default flash
    if (!hasConfirmedData) {
      return ""
    }

    // If custom branding exists and we have a custom value, use it
    if (hasCustomBranding && customValue) {
      return customValue
    }

    // If we've confirmed no custom branding exists, use default
    // This only happens when platformSettings is null or all fields are null/empty
    if (hasConfirmedData && !hasCustomBranding) {
      return defaultValue
    }

    // Fallback: if custom branding exists but value is empty, return empty (don't use default)
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
    isLoading: isPending,
    hasData: hasConfirmedData,
  }
}