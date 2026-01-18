import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { logError } from "@/lib/utils/errorHandler"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const transactionId = searchParams.get("transaction_id")
  const txRef = searchParams.get("tx_ref")
  const courseId = searchParams.get("courseId")

  console.log('Flutterwave callback called with params:', {
    status,
    transactionId,
    txRef,
    courseId,
    allParams: Object.fromEntries(searchParams)
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  console.log('Base URL:', baseUrl)

  // If no status/transactionId, this might be a direct redirect without payment completion
  if (!status || !transactionId) {
    console.log('Flutterwave callback called without payment parameters, redirecting to courses')
    return NextResponse.redirect(`${baseUrl}/learner/courses`)
  }

  // Handle failed payments (per Flutterwave Standard guide)
  if (status === "failed" || !transactionId) {
    return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
  }

  // Only process successful payments (per Flutterwave Standard guide)
  // Flutterwave can send either 'successful' or 'completed' for successful payments
  if (status !== "successful" && status !== "completed") {
    return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
  }

  try {
    console.log('Flutterwave callback received:', { status, transactionId, txRef, searchParams: Object.fromEntries(searchParams) })

    // Extract courseId and referrer early for redirects (needed for both success and cancel cases)
    let redirectCourseId = searchParams.get("courseId")
    const referrer = searchParams.get("referrer")

    // Fallback: extract from tx_ref format: tx_${timestamp}_${userId}_${courseId}
    if (!redirectCourseId && txRef) {
      const txRefParts = txRef.split('_')
      if (txRefParts.length >= 4) {
        redirectCourseId = txRefParts[3] // courseId is the 4th part
        console.log('Extracted courseId from tx_ref for redirect:', redirectCourseId)
      }
    }

    if (status === 'successful' || status === 'completed') {
      console.log('Processing successful Flutterwave payment')

      // For successful payments, redirect to payment page
      if (!redirectCourseId) {
        console.error('Missing courseId for successful payment redirect')
        return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
      }

      console.log('Flutterwave payment successful, redirecting to payment page')
      return NextResponse.redirect(
        `${baseUrl}/learner/payment?status=success&gateway=flutterwave&courseId=${redirectCourseId}`
      )
    } else {
      console.log('Flutterwave payment not successful:', status)
      // Redirect to payment error page
      const errorUrl = redirectCourseId
        ? `${baseUrl}/learner/payment?status=error&gateway=flutterwave&courseId=${redirectCourseId}&reason=failed`
        : `${baseUrl}/learner/payment?status=error&gateway=flutterwave&reason=failed`

      return NextResponse.redirect(errorUrl)
    }
  } catch (error) {
    logError("Flutterwave verification error", error, {
      component: "payments/callback/flutterwave/route",
      action: "GET",
      transactionId,
    })
    return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
  }
}

