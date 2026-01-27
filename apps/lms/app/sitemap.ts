import { MetadataRoute } from 'next'

// Get LMS URL from environment variable
const getLmsUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getLmsUrl()
  
  // Only include auth pages that should be indexable
  return [
    {
      url: `${baseUrl}/auth/learner/login`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/learner/signup`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
