import type React from "react"
import { Poppins } from "next/font/google"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { QueryProvider } from "@/lib/QueryProvider"
import { getBrandSettings } from "@/lib/brand-settings"

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
})

// Force dynamic rendering to ensure metadata updates when SEO data changes
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching for metadata

// Get website URL from environment variable or use default
const getWebsiteUrl = () => {
  return process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.example.com'
}

export async function generateMetadata(): Promise<Metadata> {
  const brandSettings = await getBrandSettings()
  const websiteUrl = getWebsiteUrl()
  const platformName = brandSettings.platformName || "EaseLMS"
  const title = brandSettings.seoTitle || `${platformName} - Learn. Grow. Succeed.`
  const description = brandSettings.seoDescription || brandSettings.platformDescription || "Transform your life through knowledge with our comprehensive online courses."

  return {
    metadataBase: new URL(websiteUrl),
    title: {
      default: title,
      template: `%s - ${platformName}`, // For child pages
    },
    description,
    generator: "Next.js",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
        noarchive: true, // Prevents cached versions
      },
    },
    other: {
      'googlebot': 'noarchive',
      'robots': 'noarchive',
    },
    icons: {
      icon: [
        { url: brandSettings.favicon, sizes: "512x512", type: "image/png" },
        { url: brandSettings.favicon, sizes: "192x192", type: "image/png" },
        { url: brandSettings.favicon, sizes: "32x32", type: "image/png" },
        { url: brandSettings.favicon, sizes: "16x16", type: "image/png" },
      ],
      apple: [
        { url: brandSettings.favicon, sizes: "180x180", type: "image/png" },
        { url: brandSettings.favicon, sizes: "152x152", type: "image/png" },
        { url: brandSettings.favicon, sizes: "120x120", type: "image/png" },
      ],
      shortcut: brandSettings.favicon,
    },
    keywords: brandSettings.seoKeywords?.split(",").map(k => k.trim()).filter(Boolean),
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: websiteUrl,
      siteName: platformName,
      title,
      description,
      images: brandSettings.seoImage ? [{ url: brandSettings.seoImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: brandSettings.seoImage ? [brandSettings.seoImage] : undefined,
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch brand settings server-side to set initial title immediately
  const brandSettings = await getBrandSettings()
  const initialTitle = brandSettings.seoTitle || `${brandSettings.platformName} - Learn. Grow. Succeed.`

  const websiteUrl = getWebsiteUrl()
  const logoUrl = brandSettings.logoBlack || brandSettings.favicon || ''
  const contactEmail = brandSettings.contactEmail || ''

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: brandSettings.platformName || "EaseLMS",
              legalName: brandSettings.platformName || "EaseLMS",
              description: brandSettings.platformDescription || "Transform your life through knowledge with our comprehensive online courses.",
              url: websiteUrl,
              logo: logoUrl,
              ...(contactEmail && {
                contactPoint: {
                  "@type": "ContactPoint",
                  email: contactEmail,
                  contactType: "customer support",
                },
              }),
            }),
          }}
        />
        {/* Additional Meta Tags */}
        <meta name="googlebot" content="noarchive" />
        <meta name="robots" content="noarchive" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${poppins.className} bg-background text-text-primary`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Set title immediately before React hydrates to prevent default flash
                document.title = ${JSON.stringify(initialTitle)};

                // Set theme
                const storageKey = 'ui-theme';
                const theme = localStorage.getItem(storageKey) || 'system';
                let rootClass = '';

                if (theme === 'system') {
                  rootClass = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } else {
                  rootClass = theme;
                }

                if (rootClass) {
                  document.documentElement.classList.add(rootClass);
                }
              })();
            `,
          }}
        />
        <QueryProvider>
          <ThemeProvider defaultTheme="system" storageKey="ui-theme">
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
