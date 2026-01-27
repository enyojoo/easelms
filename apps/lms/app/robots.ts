import { MetadataRoute } from 'next'

// Get LMS URL from environment variable
const getLmsUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getLmsUrl()
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/auth/learner/login',
        disallow: '/',
      },
      {
        userAgent: '*',
        allow: '/auth/learner/signup',
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
