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
      './lib/certificates/fonts/**/*.afm',
      './lib/certificates/fonts/**/*.ttf',
      './node_modules/pdfkit/js/data/**/*.afm',
      '../../node_modules/pdfkit/js/data/**/*.afm',
    ],
  },
}

export default nextConfig
