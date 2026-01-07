import { useQuery } from "@tanstack/react-query"
import { PlatformSettings } from "./useSettings"
import { PLATFORM_DEFAULTS } from "@/lib/config/platform-defaults"

// Default brand settings (from hidden config)
export const DEFAULT_BRAND_SETTINGS = {
  platformName: PLATFORM_DEFAULTS.platformName,
  platformDescription: PLATFORM_DEFAULTS.platformDescription,
  logoBlack: PLATFORM_DEFAULTS.logoBlack,
  logoWhite: PLATFORM_DEFAULTS.logoWhite,
  favicon: PLATFORM_DEFAULTS.favicon,
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
  creditsEnabled?: boolean
}

// Hook to get brand settings with defaults
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
    staleTime: 5 * 60 * 1000, // 5 minutes - brand settings don't change frequently
    placeholderData: (previousData) => previousData,
  })

  const platformSettings = data?.platformSettings

  return {
    platformName: platformSettings?.platform_name || DEFAULT_BRAND_SETTINGS.platformName,
    platformDescription: platformSettings?.platform_description || DEFAULT_BRAND_SETTINGS.platformDescription,
    logoBlack: platformSettings?.logo_black || DEFAULT_BRAND_SETTINGS.logoBlack,
    logoWhite: platformSettings?.logo_white || DEFAULT_BRAND_SETTINGS.logoWhite,
    favicon: platformSettings?.favicon || DEFAULT_BRAND_SETTINGS.favicon,
    seoTitle: platformSettings?.seo_title,
    seoDescription: platformSettings?.seo_description,
    seoKeywords: platformSettings?.seo_keywords,
    seoImage: platformSettings?.seo_image,
    creditsEnabled: platformSettings?.credits_enabled !== undefined ? platformSettings.credits_enabled : true,
  }
}
