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

  const { courseId, amountUSD, courseTitle } = await request.json()

  // Get course title if not provided
  let courseTitleToUse = courseTitle
  if (!courseTitleToUse) {
    const { data: course } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single()
    courseTitleToUse = course?.title || "Course Enrollment"
  }

  // Get user's currency
  const { data: profile } = await supabase
    .from("profiles")
    .select("currency")
    .eq("id", user.id)
    .single()

  const userCurrency = profile?.currency || "USD"
  const exchangeRate = await convertCurrency(1, "USD", userCurrency)
  const convertedAmount = amountUSD * exchangeRate

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
          amountUSD: amountUSD.toString(),
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
        exchangeRate,
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
          amountUSD: amountUSD.toString(),
        },
      })

      return NextResponse.json({
        paymentLink: payment.data.link,
        gateway: "flutterwave",
        txRef,
        amount: convertedAmount,
        currency: userCurrency,
        exchangeRate,
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create payment intent" },
      { status: 500 }
    )
  }
}

