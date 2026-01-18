import { createClient } from "@/lib/supabase/server"
import { createCheckoutSession } from "@/lib/payments/stripe"
import { initializePayment } from "@/lib/payments/flutterwave"
import { convertCurrency } from "@/lib/payments/currency"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { courseId, enrollmentMode, courseTitle } = await request.json()

  console.log("Payment create-intent request:", { courseId, enrollmentMode, courseTitle, userId: user.id })

  // Validate courseId
  if (!courseId || isNaN(Number(courseId))) {
    return NextResponse.json({ error: "Invalid course ID" }, { status: 400 })
  }

  // Fetch course with price and title
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("title, price, settings")
    .eq("id", Number(courseId))
    .single()

  console.log("Course fetch result:", { course, courseError })

  if (courseError) {
    console.error("Course fetch error:", courseError)
    return NextResponse.json({ error: `Database error: ${courseError.message}` }, { status: 500 })
  }

  if (!course) {
    console.error("Course not found for ID:", courseId)
    return NextResponse.json({ error: "Course not found" }, { status: 404 })
  }

  const courseTitleToUse = courseTitle || course.title || "Course Enrollment"
  const coursePrice = course.price || 0

  // Get platform currency setting
  const { data: platformSettings } = await supabase
    .from("platform_settings")
    .select("default_currency")
    .single()

  const platformCurrency = platformSettings?.default_currency || "USD"

  // Get user's currency preference
  const { data: profile } = await supabase
    .from("profiles")
    .select("currency")
    .eq("id", user.id)
    .single()

  const userCurrency = profile?.currency || "USD"

  // Convert course price from platform currency to user currency
  const convertedAmount = await convertCurrency(coursePrice, platformCurrency, userCurrency)

  // Determine payment gateway
  const gateway = userCurrency === "NGN" ? "flutterwave" : "stripe"

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // Get user profile for name (optional, email is required)
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single()

  const customerName = userProfile?.name || user.email?.split("@")[0] || undefined

  try {
    if (gateway === "stripe") {
      const checkoutSession = await createCheckoutSession(
        convertedAmount,
        userCurrency,
        {
          userId: user.id,
          courseId: courseId.toString(),
          originalAmount: coursePrice.toString(),
          originalCurrency: platformCurrency,
        },
        `${baseUrl}/api/payments/callback/stripe?success=true&courseId=${courseId}`,
        `${baseUrl}/learner/courses/${courseId}?canceled=true`,
        user.email!, // Required: customer email
        courseTitleToUse
      )

      return NextResponse.json({
        checkoutUrl: checkoutSession.url,
        gateway: "stripe",
        amount: convertedAmount,
        currency: userCurrency,
        originalAmount: coursePrice,
        originalCurrency: platformCurrency,
      })
    } else {
      // Flutterwave - Only email is required, name is optional
      const txRef = `tx_${Date.now()}_${user.id}`
      const payment = await initializePayment({
        amount: convertedAmount,
        currency: userCurrency,
        email: user.email!, // Required
        tx_ref: txRef,
        callback_url: `${baseUrl}/api/payments/callback/flutterwave`,
        customer: {
          ...(customerName && { name: customerName }), // Optional
        },
        customizations: {
          title: courseTitleToUse,
          description: `Payment for ${courseTitleToUse}`,
        },
        metadata: {
          userId: user.id,
          courseId: courseId.toString(),
          originalAmount: coursePrice.toString(),
          originalCurrency: platformCurrency,
        },
      })

      return NextResponse.json({
        paymentLink: payment.data.link,
        gateway: "flutterwave",
        txRef,
        amount: convertedAmount,
        currency: userCurrency,
        originalAmount: coursePrice,
        originalCurrency: platformCurrency,
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create payment intent" },
      { status: 500 }
    )
  }
}

