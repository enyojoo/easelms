import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const success = searchParams.get("success")
  const courseId = searchParams.get("courseId")

  if (success === "true" && courseId) {
    // Redirect to the course learn page
    // The webhook will handle the actual enrollment
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/learner/courses/${courseId}/learn?payment=success`
    )
  }

  // If payment was canceled or failed, redirect back to course page
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/learner/courses/${courseId || ""}?payment=canceled`
  )
}

