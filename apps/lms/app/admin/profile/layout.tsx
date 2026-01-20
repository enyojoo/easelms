import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generatePageMetadata("Admin Profile")

  // Hide admin pages from search engines
  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default function AdminProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
