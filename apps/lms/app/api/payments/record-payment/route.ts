import { createServiceRoleClient } from "@/lib/supabase/server"
import { convertCurrency } from "@/lib/payments/currency"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const serviceSupabase = createServiceRoleClient()
    const { courseId, userId, amount, gateway } = await request.json()

    console.log("Record payment API called:", { courseId, userId, amount, gateway })

    if (!courseId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get course details including currency to understand the original pricing
    const { data: course, error: courseError } = await serviceSupabase
      .from("courses")
      .select("price, currency")
      .eq("id", parseInt(courseId))
      .single()

    if (courseError || !course) {
      console.error("Course fetch error:", courseError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Use the course's currency as the original currency
    const courseCurrency = course.currency || "USD"

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
      // The course price is in courseCurrency, payment was made in userCurrency
      originalAmount = coursePrice
      originalCurrency = courseCurrency
      paymentAmount = coursePrice // For Flutterwave, payment amount equals course price
      paymentCurrency = userCurrency

      // Convert payment amount to USD for reporting
      try {
        amountUSD = await convertCurrency(paymentAmount, paymentCurrency, "USD")
      } catch (conversionError) {
        console.warn("Currency conversion failed, using fallback:", conversionError)
        amountUSD = paymentAmount // Fallback if conversion fails
      }

      exchangeRate = amountUSD / originalAmount || 1
    } else if (gateway === "stripe") {
      // For Stripe, payment was made in converted amount (typically USD or EUR)
      // The 'amount' passed should be the actual payment amount
      originalAmount = coursePrice
      originalCurrency = courseCurrency
      paymentAmount = amount // The actual amount paid
      paymentCurrency = userCurrency

      // Convert payment amount to USD for reporting
      try {
        amountUSD = await convertCurrency(paymentAmount, paymentCurrency, "USD")
      } catch (conversionError) {
        console.warn("Currency conversion failed, using payment amount as USD:", conversionError)
        amountUSD = paymentAmount // Fallback: assume it's already in USD
      }

      exchangeRate = amountUSD / originalAmount || 1
    } else {
      // Fallback for unknown gateways
      originalAmount = coursePrice
      originalCurrency = courseCurrency
      paymentAmount = amount
      paymentCurrency = userCurrency

      // Convert to USD for reporting
      try {
        amountUSD = await convertCurrency(paymentAmount, paymentCurrency, "USD")
      } catch (conversionError) {
        console.warn("Currency conversion failed, using payment amount:", conversionError)
        amountUSD = paymentAmount
      }

      exchangeRate = 1
    }

    // Create payment record with proper currency handling
    const { data: paymentData, error: paymentError } = await serviceSupabase
      .from("payments")
      .insert({
        user_id: userId,
        course_id: parseInt(courseId),
        amount_usd: amountUSD, // USD equivalent
        original_amount: originalAmount,
        original_currency: originalCurrency,
        payment_amount: paymentAmount,
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

    console.log("Payment record created successfully:", {
      id: paymentData.id,
      gateway,
      originalAmount,
      originalCurrency,
      paymentAmount,
      paymentCurrency,
      amountUSD,
      exchangeRate
    })

    return NextResponse.json({ success: true, payment: paymentData })
  } catch (error: any) {
    console.error("Payment recording error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}