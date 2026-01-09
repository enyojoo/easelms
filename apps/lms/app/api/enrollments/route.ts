import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      logError("Enrollments API: Auth error", authError, {
        component: "enrollments/route",
        action: "GET",
      })
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
      logWarning("Service role key not available, using regular client", {
        component: "enrollments/route",
        action: "GET",
        error: serviceError.message,
      })
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
      logWarning("Enrollments API: Error with courses relation, trying without", {
        component: "enrollments/route",
        action: "GET",
        error: error.message,
        userId: user.id,
      })
      const { data: enrollmentsData, error: enrollmentsError } = await clientToUse
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
      
      if (!enrollmentsError) {
        data = enrollmentsData
        error = null
      } else {
        logError("Enrollments API: Database error", enrollmentsError, {
          component: "enrollments/route",
          action: "GET",
          code: enrollmentsError.code,
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
      logError("Enrollments API: Database error", error, {
        component: "enrollments/route",
        action: "GET",
        code: error.code,
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
    logError("Enrollments API: Unexpected error", error, {
      component: "enrollments/route",
      action: "GET",
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

  // Use service role client for admin checks and enrollment operations to bypass RLS
  const serviceSupabase = createServiceRoleClient()

  // Check if user is admin if userId is provided (admin enrolling another user)
  let targetUserId = user.id
  if (userId && userId !== user.id) {
    // Verify the requesting user is an admin using service role client to bypass RLS
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profileError) {
      logError("Enrollments API: Error checking admin status", profileError, {
        component: "enrollments/route",
        action: "POST",
        userId: user.id,
      })
      return NextResponse.json({ error: "Failed to verify admin status" }, { status: 500 })
    }

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only admins can enroll other users" }, { status: 403 })
    }

    targetUserId = userId
  }

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })
  }

  // Check if user is already enrolled in this course
  const { data: existingEnrollment, error: checkEnrollmentError } = await serviceSupabase
    .from("enrollments")
    .select("id, status")
    .eq("user_id", targetUserId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (checkEnrollmentError && checkEnrollmentError.code !== "PGRST116") {
    logError("Enrollments API: Error checking existing enrollment", checkEnrollmentError, {
      component: "enrollments/route",
      action: "POST",
      userId: targetUserId,
      courseId,
    })
    return NextResponse.json({ error: "Failed to check enrollment status" }, { status: 500 })
  }

  if (existingEnrollment) {
    return NextResponse.json({ 
      error: "User is already enrolled in this course",
      enrollment: existingEnrollment 
    }, { status: 409 }) // 409 Conflict
  }

  // Check prerequisites before enrollment
  const { data: prerequisitesData } = await serviceSupabase
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
    const { data: completedEnrollments } = await serviceSupabase
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

  const { data, error } = await serviceSupabase
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
    logError("Enrollments API: Error creating enrollment", error, {
      component: "enrollments/route",
      action: "POST",
      userId: targetUserId,
      courseId,
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update enrolled_students count in courses table
  // Recalculate the count to ensure accuracy
  const { count: currentCount } = await serviceSupabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId)

  // Update the courses table with the new count
  await serviceSupabase
    .from("courses")
    .update({ enrolled_students: currentCount || 0 })
    .eq("id", courseId)

  // Send enrollment email notification (non-blocking)
  if (data?.id) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/send-email-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "enrollment",
        enrollmentId: data.id.toString(),
      }),
    }).catch((error) => {
      logWarning("Failed to trigger enrollment email", {
        component: "enrollments/route",
        action: "POST",
        enrollmentId: data.id,
        error: error?.message,
      })
    })
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

  logInfo("Updating enrollment", { userId: user.id, courseId, status })

  // First check if enrollment exists
  const { data: existingEnrollment, error: checkError } = await serviceSupabase
    .from("enrollments")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single()

  if (checkError && checkError.code !== "PGRST116") { // PGRST116 = not found, which is ok
    logError("Error checking enrollment", checkError, {
      component: "enrollments/route",
      action: "PATCH",
      userId: user.id,
      courseId,
    })
    return NextResponse.json({ error: checkError.message }, { status: 500 })
  }

  if (!existingEnrollment) {
    logError("Enrollment not found for user", new Error("Enrollment not found"), {
      component: "enrollments/route",
      action: "PATCH",
      userId: user.id,
      courseId,
    })
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

  // Send completion email notification if status changed to completed (non-blocking)
  if (status === "completed" && data?.id && existingEnrollment?.status !== "completed") {
    // Send completion email to student
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/send-email-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "completion",
        enrollmentId: data.id.toString(),
      }),
    }).catch((error) => {
      logWarning("Failed to trigger completion email", {
        component: "enrollments/route",
        action: "PATCH",
        enrollmentId: data.id,
        error: error?.message,
      })
    })

    // Send admin notification for course completion
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/send-email-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "admin-completion",
        enrollmentId: data.id.toString(),
      }),
    }).catch((error) => {
      logWarning("Failed to trigger admin completion notification", {
        component: "enrollments/route",
        action: "PATCH",
        enrollmentId: data.id,
        error: error?.message,
      })
    })
  }

  if (error) {
    logError("Error updating enrollment", error, {
      component: "enrollments/route",
      action: "PATCH",
      userId: user.id,
      courseId,
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  logInfo("Enrollment updated successfully", { userId: user.id, courseId, status })
  return NextResponse.json({ enrollment: data })
}
