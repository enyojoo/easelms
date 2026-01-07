import { createServiceRoleClient } from "./server"

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

const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  platformName: PLATFORM_DEFAULTS.platformName,
  platformDescription: PLATFORM_DEFAULTS.platformDescription,
  logoBlack: PLATFORM_DEFAULTS.logoBlack,
  logoWhite: PLATFORM_DEFAULTS.logoWhite,
  favicon: PLATFORM_DEFAULTS.favicon,
  creditsEnabled: PLATFORM_DEFAULTS.credits.enabled,
}

export async function getBrandSettings(): Promise<BrandSettings> {
  try {
    const supabase = createServiceRoleClient()
    const { data: platformSettings } = await supabase
      .from("platform_settings")
      .select("*")
      .single()

    if (!platformSettings) {
      return DEFAULT_BRAND_SETTINGS
    }

    return {
      platformName: platformSettings.platform_name || DEFAULT_BRAND_SETTINGS.platformName,
      platformDescription: platformSettings.platform_description || DEFAULT_BRAND_SETTINGS.platformDescription,
      logoBlack: platformSettings.logo_black || DEFAULT_BRAND_SETTINGS.logoBlack,
      logoWhite: platformSettings.logo_white || DEFAULT_BRAND_SETTINGS.logoWhite,
      favicon: platformSettings.favicon || DEFAULT_BRAND_SETTINGS.favicon,
      seoTitle: platformSettings.seo_title,
      seoDescription: platformSettings.seo_description,
      seoKeywords: platformSettings.seo_keywords,
      seoImage: platformSettings.seo_image,
      creditsEnabled: platformSettings.credits_enabled !== undefined ? platformSettings.credits_enabled : true,
    }
  } catch (error) {
    console.error("Error fetching brand settings:", error)
    return DEFAULT_BRAND_SETTINGS
  }
}

  }
}
