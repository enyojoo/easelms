import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const recommended = searchParams.get("recommended") === "true"
    const ids = searchParams.get("ids")

    // For public course listing on website, fetch from LMS API
    // The LMS API handles authentication and RLS internally
    const lmsUrl = process.env.NEXT_PUBLIC_LMS_URL || "http://localhost:3001"
    const apiUrl = new URL(`${lmsUrl}/api/courses`)

    // Forward query parameters
    if (recommended) apiUrl.searchParams.append("recommended", "true")
    if (ids) apiUrl.searchParams.append("ids", ids)

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch courses" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Process courses for website display (marketing-focused)
    const processedCourses = data.courses?.map((course: any) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      image: course.image || course.thumbnail || "/placeholder.svg",
      price: course.price || 0,
      lessons: course.lessons || [],
      settings: course.settings || {},
      totalHours: course.totalHours || 0,
      enrolledStudents: course.enrolledStudents || 0,
      previewVideo: course.preview_video || null,
      // Add any additional marketing fields if needed
    })) || []

    return NextResponse.json({ courses: processedCourses })
  } catch (error: any) {
    console.error("Website courses API error:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while fetching courses" },
      { status: 500 }
    )
  }
}