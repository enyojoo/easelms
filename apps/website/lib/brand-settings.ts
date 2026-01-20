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

const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  platformName: "EaseLMS",
  platformDescription: "EaseLMS is a modern, open-source Learning Management System built with modern tech stack. It provides a complete solution for creating, managing, and delivering online courses with features like video lessons, interactive quizzes, progress tracking, certificates, and payment integration.",
  logoBlack: "https://cldup.com/VQGhFU5kd6.svg",
  logoWhite: "https://cldup.com/bwlFqC4f8I.svg",
  favicon: "https://cldup.com/6yEKvPtX22.svg",
}

export async function getBrandSettings(): Promise<BrandSettings> {
  try {
    // Try to fetch from LMS brand settings API
    const lmsUrl = (process.env.NEXT_PUBLIC_LMS_URL || "http://localhost:3001").replace(/\/$/, '') // Remove trailing slash
    const response = await fetch(`${lmsUrl}/api/brand-settings`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (!response.ok) {
      // If LMS API is not available, use defaults
      return DEFAULT_BRAND_SETTINGS
    }

    const data = await response.json()
    const platformSettings = data.platformSettings

    // If no record exists at all, use defaults
    if (!platformSettings) {
      return DEFAULT_BRAND_SETTINGS
    }

    // Check if ANY custom brand setting has been set
    const hasCustomBranding = !!(
      platformSettings.platform_name ||
      platformSettings.logo_black ||
      platformSettings.logo_white ||
      platformSettings.favicon ||
      platformSettings.seo_title ||
      platformSettings.seo_description ||
      platformSettings.seo_keywords ||
      platformSettings.seo_image
    )

    // If admin has set custom branding, use custom values where set
    if (hasCustomBranding) {
      return {
        platformName: platformSettings.platform_name || DEFAULT_BRAND_SETTINGS.platformName,
        platformDescription: platformSettings.platform_description || DEFAULT_BRAND_SETTINGS.platformDescription,
        logoBlack: platformSettings.logo_black || DEFAULT_BRAND_SETTINGS.logoBlack,
        logoWhite: platformSettings.logo_white || DEFAULT_BRAND_SETTINGS.logoWhite,
        favicon: platformSettings.favicon || DEFAULT_BRAND_SETTINGS.favicon,
        seoTitle: platformSettings.seo_title || undefined,
        seoDescription: platformSettings.seo_description || undefined,
        seoKeywords: platformSettings.seo_keywords || undefined,
        seoImage: platformSettings.seo_image || undefined,
      }
    }

    // No custom branding set - use defaults
    return DEFAULT_BRAND_SETTINGS
  } catch (error) {
    console.error("Error fetching brand settings:", error)
    return DEFAULT_BRAND_SETTINGS
  }
}