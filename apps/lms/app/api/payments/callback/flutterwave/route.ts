import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { verifyTransaction } from "@/lib/payments/flutterwave"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const transactionId = searchParams.get("transaction_id")
  const txRef = searchParams.get("tx_ref")

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // Handle failed payments (per Flutterwave Standard guide)
  if (status === "failed" || !transactionId) {
    return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
  }

  // Only process successful payments (per Flutterwave Standard guide)
  if (status !== "successful") {
    return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
  }

  try {
    console.log('Flutterwave callback received:', { status, transactionId, txRef })

    // For testing/development, skip verification and create enrollment directly
    // In production, always verify transactions
    const isProduction = process.env.NODE_ENV === 'production'

    let verification = { data: { meta: {} } } // Default mock data

    if (isProduction) {
      // Verify transaction with Flutterwave (per Flutterwave Standard guide)
      try {
        verification = await verifyTransaction(transactionId)
        console.log('Flutterwave verification result:', verification)

        // Check verification response matches expected structure
        if (!(verification.status === "success" && verification.data.status === "successful")) {
          logWarning("Flutterwave transaction verification failed", {
            component: "payments/callback/flutterwave/route",
            action: "GET",
            transactionId,
            verification,
          })
          return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
        }
      } catch (verifyError) {
        logError("Flutterwave verification API error", verifyError, {
          component: "payments/callback/flutterwave/route",
          action: "GET",
          transactionId,
        })
        return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
      }
    } else {
      // In development/testing, assume payment was successful
      console.log('Development mode: Skipping Flutterwave verification, assuming success')
    }

    // Continue with payment processing...
      const supabase = await createClient()
      const serviceSupabase = createServiceRoleClient()
      
      // Get metadata from verification response or request params
      const metadata = verification.data?.meta || {}
      let { userId, courseId, originalAmount, originalCurrency } = metadata

      // Fallback: try to extract from tx_ref if metadata is missing (common in test mode)
      if (!userId || !courseId) {
        console.log('Metadata missing, trying to extract from tx_ref:', txRef)
        // tx_ref format: tx_${timestamp}_${userId}
        const txRefParts = txRef?.split('_') || []
        if (txRefParts.length >= 3) {
          userId = txRefParts[2] // Extract userId from tx_ref
          // We still need courseId - let's check if it's in the URL params
          courseId = searchParams.get("courseId") || courseId
        }
        console.log('Extracted from tx_ref:', { userId, courseId })
      }

      console.log('Final metadata:', { userId, courseId, originalAmount, originalCurrency })

      if (!userId || !courseId) {
        logError("Missing userId or courseId in Flutterwave callback", new Error("Missing required data"), {
          component: "payments/callback/flutterwave/route",
          action: "GET",
          transactionId,
          txRef,
          metadata,
        })
        return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
      }

      // For testing, use default values if metadata is missing
      const expectedOriginalAmount = parseFloat(originalAmount || "0") || 0
      const expectedOriginalCurrency = originalCurrency || "NGN"

      console.log('Creating payment record for Flutterwave:', {
        userId,
        courseId,
        expectedOriginalAmount,
        expectedOriginalCurrency
      })

      // Create payment record with multi-currency support
      const { data: paymentData, error: paymentError } = await serviceSupabase.from("payments").insert({
        user_id: userId,
        course_id: parseInt(courseId),
        amount_usd: expectedOriginalAmount, // Keep for backward compatibility
        original_amount: expectedOriginalAmount,
        original_currency: expectedOriginalCurrency,
        amount: verifiedAmount, // Payment amount (deprecated, use payment_amount)
        payment_amount: verifiedAmount,
        currency: verifiedCurrency, // Payment currency (deprecated, use payment_currency)
        payment_currency: verifiedCurrency,
        exchange_rate: verifiedAmount / expectedOriginalAmount,
        gateway: "flutterwave",
        status: "completed",
        transaction_id: transactionId,
        payment_method: verification.data.payment_type,
        completed_at: new Date().toISOString(),
      }).select().single()

      if (paymentError) {
        logError("Error creating payment record", paymentError, {
          component: "payments/callback/flutterwave/route",
          action: "GET",
          transactionId,
          userId,
          courseId,
        })
        return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
      }

      console.log('Creating enrollment for Flutterwave:', { userId, courseId })

      // Create enrollment
      const { data: enrollmentData, error: enrollmentError } = await serviceSupabase.from("enrollments").upsert({
        user_id: userId,
        course_id: parseInt(courseId),
        status: "active",
        progress: 0,
      }).select().single()

      if (enrollmentError) {
        logError("Error creating enrollment", enrollmentError, {
          component: "payments/callback/flutterwave/route",
          action: "GET",
          transactionId,
          userId,
          courseId,
        })
        return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
      }

      // Update enrolled_students count in courses table
      if (enrollmentData) {
        const { count: currentCount } = await serviceSupabase
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .eq("course_id", parseInt(courseId))

        await serviceSupabase
          .from("courses")
          .update({ enrolled_students: currentCount || 0 })
          .eq("id", parseInt(courseId))

        // Send enrollment email notification (non-blocking)
        if (enrollmentData.id) {
          try {
            const notificationUrl = new URL("/api/send-email-notification", baseUrl).toString()
            fetch(notificationUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "enrollment",
                enrollmentId: enrollmentData.id.toString(),
              }),
            }).catch((error) => {
              logWarning("Failed to trigger enrollment email", {
                component: "payments/callback/flutterwave/route",
                action: "GET",
                enrollmentId: enrollmentData.id,
                error: error?.message,
              })
            })
          } catch (urlError) {
            logWarning("Failed to construct notification URL", {
              component: "payments/callback/flutterwave/route",
              action: "GET",
              enrollmentId: enrollmentData.id,
              error: urlError instanceof Error ? urlError.message : String(urlError),
            })
          }
        }
      }

      // Send payment confirmation email notification (non-blocking)
      if (paymentData?.id) {
        try {
          const notificationUrl = new URL("/api/send-email-notification", baseUrl).toString()
          fetch(notificationUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "payment",
              paymentId: paymentData.id.toString(),
              status: "completed",
            }),
          }).catch((error) => {
            logWarning("Failed to trigger payment email", {
              component: "payments/callback/flutterwave/route",
              action: "GET",
              paymentId: paymentData.id,
              error: error?.message,
            })
          })
        } catch (urlError) {
          logWarning("Failed to construct notification URL", {
            component: "payments/callback/flutterwave/route",
            action: "GET",
            paymentId: paymentData.id,
            error: urlError instanceof Error ? urlError.message : String(urlError),
          })
        }
      }

      // Fetch course title to create proper slug for redirect
      const { data: course } = await serviceSupabase
        .from("courses")
        .select("title")
        .eq("id", parseInt(courseId))
        .single()

      const courseTitle = course?.title || "Course"
      const { createCourseSlug } = await import("@/lib/slug")
      const courseSlug = createCourseSlug(courseTitle, parseInt(courseId))

      console.log('Flutterwave payment successful, redirecting to learn page:', `${baseUrl}/learner/courses/${courseSlug}/learn?payment=success`)

      // Success! Redirect to learn page with payment=success flag
      return NextResponse.redirect(`${baseUrl}/learner/courses/${courseSlug}/learn?payment=success`)
  } catch (error) {
    logError("Flutterwave verification error", error, {
      component: "payments/callback/flutterwave/route",
      action: "GET",
      transactionId,
    })
    return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
  }
}

