import { MetadataRoute } from 'next'
import { createCourseSlug } from '@/lib/slug'

// Get website URL from environment variable
const getWebsiteUrl = () => {
  return process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.example.com'
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getWebsiteUrl()
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Fetch all courses dynamically
  let coursePages: MetadataRoute.Sitemap = []
  
  try {
    const lmsUrl = (process.env.NEXT_PUBLIC_LMS_URL || "http://localhost:3001").replace(/\/$/, '')
    const response = await fetch(`${lmsUrl}/api/courses?all=true`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (response.ok) {
      const data = await response.json()
      const courses = data.courses || []

      coursePages = courses.map((course: any) => ({
        url: `${baseUrl}/courses/${createCourseSlug(course.title, course.id)}`,
        changeFrequency: 'monthly' as const,
        priority: 0.9,
      }))
    }
  } catch (error) {
    console.error('Error fetching courses for sitemap:', error)
    // Continue with static pages only if course fetch fails
  }

  return [...staticPages, ...coursePages]
}
