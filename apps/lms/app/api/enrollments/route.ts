import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error("Enrollments API: Auth error", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client to bypass RLS and avoid recursion
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      console.warn("Service role key not available, using regular client:", serviceError.message)
      serviceClient = null
    }

    const clientToUse = serviceClient || supabase

    // Try to fetch enrollments with courses relation first
    let { data, error } = await clientToUse
      .from("enrollments")
      .select(`
        *,
        courses (*)
      `)
      .eq("user_id", user.id)

    // If error with courses relation, try without it (might be RLS issue even with service client)
    if (error) {
      console.warn("Enrollments API: Error with courses relation, trying without:", error.message)
      const { data: enrollmentsData, error: enrollmentsError } = await clientToUse
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
      
      if (!enrollmentsError) {
        data = enrollmentsData
        error = null
      } else {
        console.error("Enrollments API: Database error", {
          error: enrollmentsError,
          code: enrollmentsError.code,
          message: enrollmentsError.message,
          details: enrollmentsError.details,
          hint: enrollmentsError.hint,
          userId: user.id,
        })
        return NextResponse.json({ 
          error: enrollmentsError.message,
          details: enrollmentsError.details,
          hint: enrollmentsError.hint,
        }, { status: 500 })
      }
    }

    if (error) {
      console.error("Enrollments API: Database error", {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: user.id,
      })
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
      }, { status: 500 })
    }

    // Return empty array if no enrollments (not an error)
    return NextResponse.json({ enrollments: data || [] })
  } catch (error: any) {
    console.error("Enrollments API: Unexpected error", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json({ 
      error: error?.message || "An unexpected error occurred while fetching enrollments",
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { courseId, userId } = await request.json()

  // Check if user is admin if userId is provided (admin enrolling another user)
  let targetUserId = user.id
  if (userId && userId !== user.id) {
    // Verify the requesting user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only admins can enroll other users" }, { status: 403 })
    }

    targetUserId = userId
  }

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })
  }

  // Check prerequisites before enrollment
  const { data: prerequisitesData } = await supabase
    .from("course_prerequisites")
    .select(`
      prerequisite_course_id,
      courses!course_prerequisites_prerequisite_course_id_fkey (
        id,
        title
      )
    `)
    .eq("course_id", courseId)

  if (prerequisitesData && prerequisitesData.length > 0) {
    // Get prerequisite course IDs
    const prerequisiteIds = prerequisitesData.map((p: any) => p.prerequisite_course_id)

    // Check if user has completed all prerequisites
    const { data: completedEnrollments } = await supabase
      .from("enrollments")
      .select("course_id, completed_at, progress")
      .eq("user_id", targetUserId)
      .in("course_id", prerequisiteIds)
      .not("completed_at", "is", null)

    const completedPrerequisiteIds = new Set(
      (completedEnrollments || []).map((e: any) => e.course_id)
    )

    // Find missing prerequisites
    const missingPrerequisites = prerequisitesData
      .filter((p: any) => !completedPrerequisiteIds.has(p.prerequisite_course_id))
      .map((p: any) => {
        // Check if user is enrolled but not completed
        const enrollment = completedEnrollments?.find((e: any) => e.course_id === p.prerequisite_course_id)
        const isEnrolled = enrollment !== undefined
        const isInProgress = isEnrolled && !enrollment.completed_at && enrollment.progress > 0

        return {
          id: p.prerequisite_course_id,
          title: p.courses?.title || `Course ${p.prerequisite_course_id}`,
          status: isInProgress ? "in_progress" : "not_started",
        }
      })

    if (missingPrerequisites.length > 0) {
      return NextResponse.json(
        {
          error: "Prerequisites not met",
          missingPrerequisites,
        },
        { status: 400 }
      )
    }
  }

  const { data, error } = await supabase
    .from("enrollments")
    .insert({
      user_id: targetUserId,
      course_id: courseId,
      status: "active",
      progress: 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enrollment: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { courseId, status } = await request.json()

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })
  }

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 })
  }

  // Use service role client to bypass RLS
  const serviceSupabase = createServiceRoleClient()

  console.log("📝 Updating enrollment:", { userId: user.id, courseId, status })

  // First check if enrollment exists
  const { data: existingEnrollment, error: checkError } = await serviceSupabase
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single()

  if (checkError && checkError.code !== "PGRST116") { // PGRST116 = not found, which is ok
    console.error("Error checking enrollment:", checkError)
    return NextResponse.json({ error: checkError.message }, { status: 500 })
  }

  if (!existingEnrollment) {
    console.error("Enrollment not found for user:", user.id, "course:", courseId)
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })
  }

  // Update enrollment with status and completed_at
  const updateData: any = {
    status: status,
  }

  if (status === "completed") {
    updateData.completed_at = new Date().toISOString()
    // Also update progress to 100% if completing
    updateData.progress = 100
  } else {
    updateData.completed_at = null
  }

  const { data, error } = await serviceSupabase
    .from("enrollments")
    .update(updateData)
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .select()
    .single()

  if (error) {
    console.error("❌ Error updating enrollment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log("✅ Enrollment updated successfully:", data)
  return NextResponse.json({ enrollment: data })
}
