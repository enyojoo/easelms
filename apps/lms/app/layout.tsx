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

export async function generateMetadata(): Promise<Metadata> {
  const brandSettings = await getBrandSettings()
  
  const title = brandSettings.seoTitle || `${brandSettings.platformName} - Learning Management System`
  const description = brandSettings.seoDescription || brandSettings.platformDescription
  
  return {
    title,
    description,
    generator: "Next.js",
    icons: {
      icon: brandSettings.favicon,
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} bg-background text-text-primary`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
