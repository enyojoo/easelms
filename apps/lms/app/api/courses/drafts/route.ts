import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Save or update a course draft
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client to bypass RLS for admin operations
    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      console.warn("Service role key not available, using regular client:", serviceError.message)
      serviceClient = null
    }

    // Check if user is admin or instructor (use service client to bypass RLS)
    const clientToUse = serviceClient || supabase
    const { data: profile } = await clientToUse
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { courseId, courseData, isPublished = false } = await request.json()

    if (!courseData) {
      return NextResponse.json({ error: "Course data is required" }, { status: 400 })
    }

    // Transform course data to match database schema
    const dbCourseData = {
      title: courseData.basicInfo?.title || "",
      description: courseData.basicInfo?.description || "",
      requirements: courseData.basicInfo?.requirements || "",
      who_is_this_for: courseData.basicInfo?.whoIsThisFor || "",
      thumbnail: courseData.basicInfo?.thumbnail || null,
      preview_video: courseData.basicInfo?.previewVideo || null,
      price: courseData.basicInfo?.price ? parseFloat(courseData.basicInfo.price) : null,
      settings: courseData.settings || {},
      is_published: isPublished,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }

    let result

    // Use service client for database operations to bypass RLS
    const dbClient = serviceClient || supabase

    if (courseId && courseId !== "new") {
      // Update existing course
      const { data, error } = await dbClient
        .from("courses")
        .update(dbCourseData)
        .eq("id", courseId)
        .eq("created_by", user.id) // Ensure user owns the course
        .select()
        .single()

      if (error) {
        console.error("Error updating course draft:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    } else {
      // Create new course draft
      const { data, error } = await dbClient
        .from("courses")
        .insert({
          ...dbCourseData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating course draft:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    }

    // Save lessons if provided
    if (courseData.lessons && Array.isArray(courseData.lessons) && result.id) {
      // Delete existing lessons for this course
      await dbClient
        .from("lessons")
        .delete()
        .eq("course_id", result.id)

      // Insert new lessons
      const lessonsToInsert = courseData.lessons.map((lesson: any, index: number) => ({
        course_id: result.id,
        title: lesson.title || "",
        type: lesson.type || "text",
        content: lesson.content || {},
        resources: lesson.resources || [],
        settings: lesson.settings || {},
        quiz: lesson.quiz || null,
        estimated_duration: lesson.estimatedDuration || 0,
        order_index: index,
      }))

      if (lessonsToInsert.length > 0) {
        const { error: lessonsError } = await dbClient
          .from("lessons")
          .insert(lessonsToInsert)

        if (lessonsError) {
          console.error("Error saving lessons:", lessonsError)
          // Don't fail the request, just log the error
        }
      }
    }

    return NextResponse.json({ 
      course: result,
      courseId: result.id 
    })
  } catch (error: any) {
    console.error("Unexpected error saving draft:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while saving draft" },
      { status: 500 }
    )
  }
}

// Get draft by course ID
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin or instructor
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("courses")
      .select(`
        *,
        lessons (
          *,
          resources (*),
          quiz_questions (*)
        )
      `)
      .eq("id", courseId)
      .eq("created_by", user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json({ course: data })
  } catch (error: any) {
    console.error("Unexpected error fetching draft:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while fetching draft" },
      { status: 500 }
    )
  }
}

