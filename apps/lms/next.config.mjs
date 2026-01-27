/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure PDFKit fonts and Poppins fonts are included in the Vercel serverless bundle
  // This tells Vercel to include these files in the serverless function bundle
  // The fonts are copied to lib/certificates/fonts during postinstall
  // and also included from node_modules as a fallback
  outputFileTracingIncludes: {
    '/api/certificates/**': [
      './apps/lms/lib/certificates/fonts/**/*.afm',
      './apps/lms/lib/certificates/fonts/**/*.ttf',
      './lib/certificates/fonts/**/*.afm',
      './lib/certificates/fonts/**/*.ttf',
      './node_modules/pdfkit/js/data/**/*.afm',
      '../../node_modules/pdfkit/js/data/**/*.afm',
    ],
  },
  async headers() {
    return [
      {
        // Allow specific auth pages with limited robots tag (must come first)
        source: '/auth/learner/login',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noarchive',
          },
        ],
      },
      {
        source: '/auth/learner/signup',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noarchive',
          },
        ],
      },
      {
        // Block admin routes
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
      {
        // Block learner routes
        source: '/learner/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
      {
        // Block other auth routes (but login/signup already handled above)
        source: '/auth/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
      {
        // Block API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
      {
        // Block forgot password routes
        source: '/forgot-password/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
    ]
  },
}

export default nextConfig
