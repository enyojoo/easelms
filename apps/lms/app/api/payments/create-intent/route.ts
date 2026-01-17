import { createClient } from "@/lib/supabase/server"
import { createCheckoutSession } from "@/lib/payments/stripe"
import { initializePayment } from "@/lib/payments/flutterwave"
import { convertCurrency } from "@/lib/payments/currency"
import { NextResponse } from "next/server"

// Get platform settings
async function getPlatformSettings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("platform_settings")
    .select("default_currency")
    .single()
  return data?.default_currency || "USD"
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { courseId, amount, courseTitle } = await request.json() // amount is in platform currency

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

  // Get platform settings and user currency
  const platformCurrency = await getPlatformSettings()
  const { data: profile } = await supabase
    .from("profiles")
    .select("currency")
    .eq("id", user.id)
    .single()

  const userCurrency = profile?.currency || "USD"

  // Convert from platform currency to user's currency
  const exchangeRate = await convertCurrency(1, platformCurrency, userCurrency)
  const convertedAmount = amount * exchangeRate

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
        platformAmount: amount,
        platformCurrency: platformCurrency,
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
          amount: amount.toString(),
          platformCurrency: platformCurrency,
        },
      })

      return NextResponse.json({
        paymentLink: payment.data.link,
        gateway: "flutterwave",
        txRef,
        amount: convertedAmount,
        currency: userCurrency,
        platformAmount: amount,
        platformCurrency: platformCurrency,
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

