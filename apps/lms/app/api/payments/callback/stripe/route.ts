import { NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const success = searchParams.get("success")
  const courseId = searchParams.get("courseId")
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  if (success === "true" && courseId) {
    // Fetch course title to create proper slug for redirect
    const serviceSupabase = createServiceRoleClient()
    const { data: course } = await serviceSupabase
      .from("courses")
      .select("title")
      .eq("id", parseInt(courseId))
      .single()

    const courseTitle = course?.title || "Course"
    const { createCourseSlug } = await import("@/lib/slug")
    const courseSlug = createCourseSlug(courseTitle, parseInt(courseId))

    // Redirect to the payment results page
    // The payment page will handle enrollment and payment records
    return NextResponse.redirect(
      `${baseUrl}/learner/payment?status=success&gateway=stripe&courseId=${courseId}`
    )
  }

  // If payment was canceled or failed, redirect back to course page
  // Fetch course title for proper slug
  if (courseId) {
    const supabase = await createClient()
    const { data: course } = await supabase
      .from("courses")
      .select("title")
      .eq("id", parseInt(courseId))
      .single()

    const courseTitle = course?.title || "Course"
    const { createCourseSlug } = await import("@/lib/slug")
    const courseSlug = createCourseSlug(courseTitle, parseInt(courseId))
    
    return NextResponse.redirect(
      `${baseUrl}/learner/payment?status=error&gateway=stripe&courseId=${courseId}&reason=cancelled`
    )
  }

  return NextResponse.redirect(
    `${baseUrl}/learner/payment?status=error&gateway=stripe&reason=cancelled`
  )
}

