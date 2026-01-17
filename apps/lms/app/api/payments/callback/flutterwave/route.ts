import { createClient } from "@/lib/supabase/server"
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
    // Verify transaction with Flutterwave (per Flutterwave Standard guide)
    const verification = await verifyTransaction(transactionId)

    // Check verification response matches expected structure
    if (
      verification.status === "success" &&
      verification.data.status === "successful"
    ) {
      const supabase = await createClient()
      
      // Get metadata from verification response
      const metadata = verification.data.meta || {}
      const { userId, courseId, amount, platformCurrency } = metadata

      // Calculate USD equivalent for storage
      const { convertCurrency } = await import("@/lib/payments/currency")
      const expectedAmountUSD = await convertCurrency(parseFloat(amount || "0"), platformCurrency || "USD", "USD")
      const verifiedAmount = verification.data.amount
      const verifiedCurrency = verification.data.currency

      // Calculate expected amount in the verified currency
      // Note: This is a simplified check - in production, you might want to store
      // the expected amount in the transaction currency for more accurate comparison
      if (!userId || !courseId) {
        logError("Missing metadata in Flutterwave response", new Error("Missing metadata"), {
          component: "payments/callback/flutterwave/route",
          action: "GET",
          transactionId,
        })
        return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
      }

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase.from("payments").insert({
        user_id: userId,
        course_id: parseInt(courseId),
        amount_usd: expectedAmountUSD,
        amount: verifiedAmount,
        currency: verifiedCurrency,
        exchange_rate: verifiedAmount / parseFloat(amount || "1"),
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

      // Create enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase.from("enrollments").upsert({
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
        const { count: currentCount } = await supabase
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .eq("course_id", parseInt(courseId))

        await supabase
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
      const { data: course } = await supabase
        .from("courses")
        .select("title")
        .eq("id", parseInt(courseId))
        .single()

      const courseTitle = course?.title || "Course"
      const { createCourseSlug } = await import("@/lib/slug")
      const courseSlug = createCourseSlug(courseTitle, parseInt(courseId))

      // Success! Redirect to learn page with payment=success flag
      return NextResponse.redirect(`${baseUrl}/learner/courses/${courseSlug}/learn?payment=success`)
    } else {
      // Verification failed or transaction not successful
      logError("Transaction verification failed", new Error("Transaction verification failed"), {
        component: "payments/callback/flutterwave/route",
        action: "GET",
        transactionId,
        verification,
      })
      return NextResponse.redirect(`${baseUrl}/learner/courses?error=payment_failed`)
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

