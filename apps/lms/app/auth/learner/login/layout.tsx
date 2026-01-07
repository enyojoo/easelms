import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("Login")
}

export default function LearnerLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
