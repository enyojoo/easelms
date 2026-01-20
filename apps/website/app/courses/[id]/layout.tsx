import { Metadata } from "next"
import { extractIdFromSlug } from "@/lib/slug"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const idStr = extractIdFromSlug(id)
  const numericId = parseInt(idStr, 10)

  if (isNaN(numericId)) {
    return {
      title: "Course - EaseLMS",
      description: "Learn new skills with our comprehensive online courses.",
    }
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
        return {
          title: `${course.title} - EaseLMS`,
          description: course.description || "Learn new skills with our comprehensive online courses.",
          openGraph: {
            title: course.title,
            description: course.description || "Learn new skills with our comprehensive online courses.",
            images: course.image ? [{ url: course.image, alt: course.title }] : undefined,
          },
          twitter: {
            card: "summary_large_image",
            title: course.title,
            description: course.description || "Learn new skills with our comprehensive online courses.",
            images: course.image ? [course.image] : undefined,
          },
        }
      }
    }
  } catch (error) {
    // If fetch fails, use default
    console.error("Error fetching course metadata:", error)
  }

  return {
    title: "Course - EaseLMS",
    description: "Learn new skills with our comprehensive online courses.",
  }
}

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}