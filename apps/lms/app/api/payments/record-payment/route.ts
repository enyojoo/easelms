import { createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const serviceSupabase = createServiceRoleClient()
    const { courseId, userId, amount, gateway } = await request.json()

    if (!courseId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get course details to understand the original pricing
    const { data: course, error: courseError } = await serviceSupabase
      .from("courses")
      .select("price")
      .eq("id", parseInt(courseId))
      .single()

    if (courseError || !course) {
      console.error("Course fetch error:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Get platform currency setting
    const { data: platformSettings } = await serviceSupabase
      .from("platform_settings")
      .select("value")
      .eq("key", "default_currency")
      .single()

    const platformCurrency = platformSettings?.value || "USD"

    // Get user profile to understand their currency preference
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("currency")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("User profile fetch error:", profileError)
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const userCurrency = userProfile?.currency || "USD"
    const coursePrice = course.price || 0

    // Determine payment details based on gateway
    let originalAmount: number
    let originalCurrency: string
    let paymentAmount: number
    let paymentCurrency: string
    let amountUSD: number
    let exchangeRate: number

    if (gateway === "flutterwave") {
      // For Flutterwave, user paid in their preferred currency
      // The 'amount' passed is the course price in platform currency
      // But the actual payment was in user currency
      originalAmount = coursePrice
      originalCurrency = platformCurrency
      paymentAmount = coursePrice // For now, assume no conversion happened
      paymentCurrency = platformCurrency
      amountUSD = coursePrice // Simplified - should convert to USD
      exchangeRate = 1
    } else if (gateway === "stripe") {
      // For Stripe, payment was made in converted amount (typically USD or EUR)
      // The 'amount' passed should be the actual payment amount
      originalAmount = coursePrice
      originalCurrency = platformCurrency
      paymentAmount = amount // The actual amount paid
      paymentCurrency = userCurrency
      amountUSD = amount // Assume Stripe payments are in USD
      exchangeRate = paymentAmount / originalAmount || 1
    } else {
      // Fallback for unknown gateways
      originalAmount = coursePrice
      originalCurrency = platformCurrency
      paymentAmount = amount
      paymentCurrency = userCurrency
      amountUSD = amount
      exchangeRate = 1
    }

    // Create payment record with proper currency handling
    const { data: paymentData, error: paymentError } = await serviceSupabase
      .from("payments")
      .insert({
        user_id: userId,
        course_id: parseInt(courseId),
        amount_usd: amountUSD, // USD equivalent (simplified)
        original_amount: originalAmount,
        original_currency: originalCurrency,
        amount: paymentAmount, // Legacy field - payment amount
        payment_amount: paymentAmount,
        currency: paymentCurrency, // Legacy field - payment currency
        payment_currency: paymentCurrency,
        exchange_rate: exchangeRate,
        gateway: gateway || "unknown",
        status: "completed",
        transaction_id: `${gateway}_${Date.now()}_${userId}`,
        payment_method: `${gateway}_card`,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (paymentError) {
      console.error("Error creating payment record:", paymentError)
      return NextResponse.json({ error: "Failed to create payment record" }, { status: 500 })
    }

    console.log("Payment record created:", {
      gateway,
      originalAmount,
      originalCurrency,
      paymentAmount,
      paymentCurrency,
      amountUSD
    })

    return NextResponse.json({ success: true, payment: paymentData })
  } catch (error: any) {
    console.error("Payment recording error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}