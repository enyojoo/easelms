import { Metadata } from "next"
import { generatePageMetadata } from "@/lib/metadata"
import { createServiceRoleClient } from "@/lib/supabase/server"
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
    return generatePageMetadata("Course")
  }

  try {
    const supabase = createServiceRoleClient()
    const { data: course } = await supabase
      .from("courses")
      .select("title, description, image")
      .eq("id", numericId)
      .single()

    if (course) {
      return generatePageMetadata("Course", {
        courseTitle: course.title,
        description: course.description || undefined,
        image: course.image || undefined,
      })
    }
  } catch (error) {
    // If fetch fails, use default
  }

  return generatePageMetadata("Course")
}

export default function AdminCourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
