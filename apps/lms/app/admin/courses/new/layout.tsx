import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("Course")
}

export default function NewCourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
