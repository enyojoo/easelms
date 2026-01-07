import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("New Password")
}

export default function NewPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
