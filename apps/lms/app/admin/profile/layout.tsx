import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("Admin Profile")
}

export default function AdminProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
