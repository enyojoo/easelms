import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // For public course detail on website, fetch from LMS API
    const lmsUrl = (process.env.NEXT_PUBLIC_LMS_URL || "http://localhost:3001").replace(/\/$/, '') // Remove trailing slash
    const apiUrl = `${lmsUrl}/api/courses/${id}`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch course" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Process course for website display (marketing-focused)
    const course = data.course
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const processedCourse = {
      id: course.id,
      title: course.title,
      description: course.description,
      image: course.image || course.thumbnail || "/placeholder.svg",
      price: course.price || 0,
      lessons: course.lessons || [],
      settings: course.settings || {},
      totalHours: course.totalHours || 0,
      totalDurationMinutes: course.totalDurationMinutes || 0,
      enrolledStudents: course.enrolledStudents || 0,
      previewVideo: course.preview_video || null,
      whoIsThisFor: course.who_is_this_for || null,
      requirements: course.requirements || null,
      prerequisites: course.prerequisites || [],
      // Instructor information if available
      instructors: course.instructors || [],
      creator: course.creator || null,
      // Certificate info
      certificate: course.settings?.certificate || null,
    }

    return NextResponse.json({ course: processedCourse })
  } catch (error: any) {
    console.error("Website course detail API error:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while fetching course" },
      { status: 500 }
    )
  }
}