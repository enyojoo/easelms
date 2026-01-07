import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"
import { getBrandSettings } from "@/lib/supabase/brand-settings"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("Admin Login")
}

export default async function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch brand settings to set title immediately via script
  const brandSettings = await getBrandSettings()
  const platformName = brandSettings.platformName || "EaseLMS"
  const title = `Admin Login - ${platformName}`
  
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
