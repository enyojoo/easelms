import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  return generatePageMetadata("Learner Details")
}

export default function LearnerDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
