import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("Learners")
}

export default function LearnersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
