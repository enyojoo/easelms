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
    // Add other metadata to ensure title is set immediately
    other: {
      // Set title immediately via script (will be handled by DynamicTitle component)
      'title-script': title,
    },
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

/**
 * Generate a script tag to set title immediately
 * This prevents flicker by setting title before React hydrates
 */
export function generateTitleScript(title: string): string {
  return `
    (function() {
      if (typeof document !== 'undefined') {
        document.title = ${JSON.stringify(title)};
      }
    })();
  `
}
