import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata("Manage Courses")
}

export default function AdminCoursesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
