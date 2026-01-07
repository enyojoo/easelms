import { Metadata } from "next"
import { getBrandSettings } from "@/lib/supabase/brand-settings"

/**
 * Generate page metadata with format: "Page Name - Platform Name"
 * For courses: "Course Title - Platform Name"
 */
export async function generatePageMetadata(
  pageName: string,
  options?: {
    description?: string
    image?: string
    courseTitle?: string
  }
): Promise<Metadata> {
  const brandSettings = await getBrandSettings()
  const platformName = brandSettings.platformName || "EaseLMS"
  
  // For course pages, use course title instead of page name
  const title = options?.courseTitle 
    ? `${options.courseTitle} - ${platformName}`
    : `${pageName} - ${platformName}`
  
  const description = options?.description || brandSettings.platformDescription
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: options?.image ? [options.image] : brandSettings.seoImage ? [brandSettings.seoImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: options?.image ? [options.image] : brandSettings.seoImage ? [brandSettings.seoImage] : undefined,
    },
  }
}
