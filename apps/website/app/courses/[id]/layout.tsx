import { Metadata } from "next"
import { extractIdFromSlug } from "@/lib/slug"
import { generatePageMetadata } from "@/lib/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const idStr = extractIdFromSlug(id)
  const numericId = parseInt(idStr, 10)

  if (isNaN(numericId)) {
    return generatePageMetadata("Course")
  }

  try {
    // Fetch course data from the website API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/courses/${id}`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (response.ok) {
      const data = await response.json()
      const course = data.course

      if (course) {
        return generatePageMetadata("Course", {
          courseTitle: course.title,
          description: course.description || "Learn new skills with our comprehensive online courses.",
          image: course.image || undefined,
        })
      }
    }
  } catch (error) {
    // If fetch fails, use default
    console.error("Error fetching course metadata:", error)
  }

  return generatePageMetadata("Course")
}

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}