import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"
import { getBrandSettings } from "@/lib/supabase/brand-settings"

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generatePageMetadata("Login")
  
  // Allow indexing for auth pages
  return {
    ...metadata,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        noarchive: true,
      },
    },
  }
}

export default async function LearnerLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch brand settings to set title immediately via script
  const brandSettings = await getBrandSettings()
  const platformName = brandSettings.platformName || "EaseLMS"
  const title = `Login - ${platformName}`
  
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              if (typeof document !== 'undefined') {
                document.title = ${JSON.stringify(title)};
              }
            })();
          `,
        }}
      />
      {children}
    </>
  )
}
