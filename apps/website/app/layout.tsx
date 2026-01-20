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

export async function generateMetadata(): Promise<Metadata> {
  const brandSettings = await getBrandSettings()

  const title = brandSettings.seoTitle || `${brandSettings.platformName} - Learn. Grow. Succeed.`
  const description = brandSettings.seoDescription || brandSettings.platformDescription

  return {
    title,
    description,
    generator: "Next.js",
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
      title,
      description,
      images: brandSettings.seoImage ? [brandSettings.seoImage] : undefined,
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
