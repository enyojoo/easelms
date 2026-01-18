import { createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const serviceSupabase = createServiceRoleClient()
    const { courseId, userId, amount, gateway } = await request.json()

    if (!courseId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create payment record (simulating webhook behavior for testing)
    const { data: paymentData, error: paymentError } = await serviceSupabase
      .from("payments")
      .insert({
        user_id: userId,
        course_id: parseInt(courseId),
        amount_usd: amount, // Keep for backward compatibility
        original_amount: amount,
        original_currency: "USD", // Assume USD for testing
        amount: Math.round(amount * 100), // Convert to cents for Stripe format
        payment_amount: Math.round(amount * 100),
        currency: "USD",
        payment_currency: "USD",
        exchange_rate: 1,
        gateway: gateway || "test",
        status: "completed",
        transaction_id: `test_${Date.now()}_${userId}`,
        payment_method: "test_card",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (paymentError) {
      console.error("Error creating payment record:", paymentError)
      return NextResponse.json({ error: "Failed to create payment record" }, { status: 500 })
    }

    return NextResponse.json({ success: true, payment: paymentData })
  } catch (error: any) {
    console.error("Payment recording error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}