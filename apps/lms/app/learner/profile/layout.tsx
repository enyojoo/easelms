import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generatePageMetadata("Profile")

  // Hide user profile pages from search engines
  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
