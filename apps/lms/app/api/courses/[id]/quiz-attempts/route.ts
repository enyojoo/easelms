import { NextResponse } from "next/server"
import { extractIdFromSlug } from "@/lib/slug"
import { logError, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { createClient, createServiceRoleClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Await params since it's a Promise in Next.js 16
  const { id } = await params
  const idStr = extractIdFromSlug(id)
  const courseId = parseInt(idStr, 10)
  
  if (isNaN(courseId)) {
    return NextResponse.json({ error: "Invalid course ID format" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const lessonId = searchParams.get("lessonId")

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId is required" }, { status: 400 })
  }

  const lessonIdNum = parseInt(lessonId, 10)
  if (isNaN(lessonIdNum)) {
    return NextResponse.json({ error: "Invalid lessonId format" }, { status: 400 })
  }

  logInfo("Quiz attempts GET", { userId: user.id, courseId, lessonId: lessonIdNum })

  // Use service role to bypass RLS
  const serviceSupabase = createServiceRoleClient()

  // Get the latest quiz attempt for this user, lesson, and course
  const { data: latestAttempt, error } = await serviceSupabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonIdNum)
    .eq("course_id", courseId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected if no attempt exists)
    logError("Error fetching quiz attempt", error, {
      component: "courses/[id]/quiz-attempts/route",
      action: "GET",
      userId: user.id,
      courseId,
      lessonId: lessonIdNum,
    })
    return NextResponse.json(createErrorResponse(error, 500, { userId: user.id, courseId, lessonId: lessonIdNum }), { status: 500 })
  }

  // Return the latest attempt (or null if no attempts exist)
  return NextResponse.json({
    attempt: latestAttempt || null,
    attemptNumber: latestAttempt?.attempt_number || 0,
  })
}
