import { MetadataRoute } from 'next'

// Get website URL from environment variable
const getWebsiteUrl = () => {
  return process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.example.com'
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getWebsiteUrl()
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
