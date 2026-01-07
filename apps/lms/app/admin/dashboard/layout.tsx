import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("Admin Dashboard")
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
