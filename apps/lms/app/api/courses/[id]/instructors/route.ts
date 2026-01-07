import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logInfo } from "@/lib/utils/errorHandler"

export const dynamic = 'force-dynamic'

// GET - Get instructors for a course
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const courseId = parseInt(id, 10)

    if (isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { data: courseInstructors, error } = await serviceSupabase
      .from("course_instructors")
      .select(`
        instructor_id,
        order_index,
        instructors (
          id,
          name,
          image,
          bio
        )
      `)
      .eq("course_id", courseId)
      .order("order_index", { ascending: true })

    if (error) {
      logError("Error fetching course instructors", error, {
        component: "courses/[id]/instructors/route",
        action: "GET",
        courseId,
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const instructors = (courseInstructors || [])
      .map((ci: any) => ci.instructors)
      .filter((instructor: any) => instructor !== null)

    return NextResponse.json({ instructors })
  } catch (error: any) {
    logError("Error in course instructors GET", error, {
      component: "courses/[id]/instructors/route",
      action: "GET",
    })
    return NextResponse.json(
      { error: error.message || "Failed to fetch course instructors" },
      { status: 500 }
    )
  }
}

// POST - Assign instructors to a course
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const courseId = parseInt(id, 10)

    if (isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client to bypass RLS for checking permissions
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      logError("Service role key not available", serviceError, {
        component: "courses/[id]/instructors/route",
        action: "POST",
      })
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check if user is admin or instructor (use service client to bypass RLS)
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { instructorIds } = await request.json()

    if (!Array.isArray(instructorIds)) {
      return NextResponse.json(
        { error: "instructorIds must be an array" },
        { status: 400 }
      )
    }

    const serviceSupabase = serviceClient

    // Delete existing course instructors
    const { error: deleteError } = await serviceSupabase
      .from("course_instructors")
      .delete()
      .eq("course_id", courseId)

    if (deleteError) {
      logError("Error deleting existing course instructors", deleteError, {
        component: "courses/[id]/instructors/route",
        action: "POST",
        courseId,
      })
    }

    // Insert new course instructors
    if (instructorIds.length > 0) {
      const courseInstructors = instructorIds.map((instructorId: string, index: number) => ({
        course_id: courseId,
        instructor_id: instructorId,
        order_index: index,
      }))

      const { error: insertError } = await serviceSupabase
        .from("course_instructors")
        .insert(courseInstructors)

      if (insertError) {
        logError("Error assigning instructors to course", insertError, {
          component: "courses/[id]/instructors/route",
          action: "POST",
          courseId,
        })
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    logInfo("Course instructors updated", { courseId, instructorCount: instructorIds.length })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logError("Error in course instructors POST", error, {
      component: "courses/[id]/instructors/route",
      action: "POST",
    })
    return NextResponse.json(
      { error: error.message || "Failed to assign instructors" },
      { status: 500 }
    )
  }
}
