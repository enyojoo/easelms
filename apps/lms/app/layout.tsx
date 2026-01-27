import type React from "react"
import { Poppins } from "next/font/google"
import type { Metadata } from "next"
import "./globals.css"
import ClientLayout from "@/components/ClientLayout"
import { getBrandSettings } from "@/lib/supabase/brand-settings"

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
})

// Force dynamic rendering to ensure metadata updates when SEO data changes
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching for metadata

// Get LMS URL from environment variable
const getLmsUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'
}

export async function generateMetadata(): Promise<Metadata> {
  const brandSettings = await getBrandSettings()
  const lmsUrl = getLmsUrl()
  const platformName = brandSettings.platformName || "EaseLMS"
  const title = brandSettings.seoTitle || `${platformName} - Learning Management System`
  const description = brandSettings.seoDescription || brandSettings.platformDescription || "Access your courses and continue learning."
  
  return {
    metadataBase: new URL(lmsUrl),
    title: {
      default: title,
      template: `%s - ${platformName}`, // For child pages
    },
    description,
    generator: "Next.js",
    // Block indexing by default - individual pages can override
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        noarchive: true,
      },
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
      url: lmsUrl,
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch brand settings server-side to set initial title immediately
  const brandSettings = await getBrandSettings()
  const initialTitle = brandSettings.seoTitle || `${brandSettings.platformName} - Learning Management System`
  
  // Prepare initial data for React Query to prevent flicker
  // Fetch actual platform settings from database to pass to client
  let initialSettingsData: { platformSettings: any } | undefined
  
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    const supabase = createServiceRoleClient()
    const { data: platformSettings } = await supabase
      .from("platform_settings")
      .select("*")
      .single()
    
    initialSettingsData = { platformSettings: platformSettings || null }
  } catch (error) {
    // If fetch fails, pass null to let client-side handle it
    initialSettingsData = { platformSettings: null }
  }
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} bg-background text-text-primary`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Set title immediately before React hydrates to prevent default flash
                document.title = ${JSON.stringify(initialTitle)};
                
                // Set theme
                const storageKey = 'easelms-theme';
                const theme = localStorage.getItem(storageKey) || 'dark';
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
        <ClientLayout initialSettingsData={initialSettingsData}>{children}</ClientLayout>
      </body>
    </html>
  )
}
