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
    // The schema uses flat columns, not a nested settings object
    const settings = courseData.settings || {}
    const enrollment = settings.enrollment || {}
    const certificate = settings.certificate || {}
    
    // Determine price - use enrollment price if available, otherwise basicInfo price
    const priceValue = enrollment.price !== undefined 
      ? enrollment.price 
      : (courseData.basicInfo?.price ? parseFloat(courseData.basicInfo.price) : null)
    
    const dbCourseData = {
      title: courseData.basicInfo?.title || "",
      description: courseData.basicInfo?.description || "",
      requirements: courseData.basicInfo?.requirements || null,
      who_is_this_for: courseData.basicInfo?.whoIsThisFor || null,
      image: courseData.basicInfo?.thumbnail || null, // Schema uses 'image', not 'thumbnail'
      preview_video: courseData.basicInfo?.previewVideo || null,
      price: priceValue,
      currency: settings.currency || "USD",
      is_published: isPublished || settings.isPublished || false,
      requires_sequential_progress: settings.requiresSequentialProgress !== undefined ? settings.requiresSequentialProgress : false,
      minimum_quiz_score: settings.minimumQuizScore !== undefined ? settings.minimumQuizScore : null,
      enrollment_mode: enrollment.enrollmentMode || "free",
      recurring_price: enrollment.recurringPrice !== undefined ? enrollment.recurringPrice : null,
      certificate_enabled: certificate.certificateEnabled || false,
      certificate_template: certificate.certificateTemplate || null,
      certificate_title: certificate.certificateTitle || null,
      certificate_description: certificate.certificateDescription || null,
      signature_image: certificate.signatureImage || null,
      signature_title: certificate.signatureTitle || null,
      additional_text: certificate.additionalText || null,
      certificate_type: certificate.certificateType || null,
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

      // Insert new lessons - map to match database schema
      const lessonsToInsert = courseData.lessons.map((lesson: any, index: number) => {
        // Store resources, quiz, and estimatedDuration in content JSONB
        const lessonContent = {
          ...(lesson.content || {}),
          resources: lesson.resources || [],
          quiz: lesson.quiz || null,
          estimatedDuration: lesson.estimatedDuration || 0,
        }

        // Extract settings fields to match schema
        const settings = lesson.settings || {}
        
        return {
          course_id: result.id,
          title: lesson.title || "",
          type: lesson.type || "text",
          content: lessonContent,
          order_index: index,
          is_required: settings.isRequired !== undefined ? settings.isRequired : true,
          video_progression: settings.videoProgression !== undefined ? settings.videoProgression : false,
        }
      })

      if (lessonsToInsert.length > 0) {
        const { error: lessonsError } = await dbClient
          .from("lessons")
          .insert(lessonsToInsert)

        if (lessonsError) {
          console.error("Error saving lessons:", lessonsError)
          // Don't fail the request, just log the error
        } else {
          console.log(`Successfully saved ${lessonsToInsert.length} lessons for course ${result.id}`)
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

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Use service client for database operations to bypass RLS
    const dbClient = serviceClient || supabase
    const { data, error } = await dbClient
      .from("courses")
      .select(`
        *,
        lessons (*)
      `)
      .eq("id", courseId)
      .eq("created_by", user.id) // Ensure user owns the course
      .single()

    if (error) {
      console.error("Error fetching course draft:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Transform lessons from database schema to frontend format
    if (data.lessons && Array.isArray(data.lessons)) {
      data.lessons = data.lessons.map((lesson: any) => {
        const content = lesson.content || {}
        const settings = {
          isRequired: lesson.is_required !== undefined ? lesson.is_required : true,
          videoProgression: lesson.video_progression !== undefined ? lesson.video_progression : false,
        }

        return {
          id: lesson.id?.toString() || `lesson-${Date.now()}`,
          title: lesson.title || "",
          type: lesson.type || "text",
          content: {
            ...content,
            // Remove resources, quiz, estimatedDuration from content as they're separate
          },
          resources: content.resources || [],
          settings: settings,
          quiz: content.quiz || null,
          estimatedDuration: content.estimatedDuration || 0,
        }
      })
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

