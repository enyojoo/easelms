import { createClient } from "@/lib/supabase/server"
import { getStripeClient } from "@/lib/payments/stripe"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripeClient()
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  const supabase = await createClient()

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const { userId, courseId, amountUSD } = paymentIntent.metadata

    // Create payment record
    await supabase.from("payments").insert({
      user_id: userId,
      course_id: parseInt(courseId),
      amount_usd: parseFloat(amountUSD),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      exchange_rate: paymentIntent.amount / 100 / parseFloat(amountUSD),
      gateway: "stripe",
      status: "completed",
      transaction_id: paymentIntent.id,
      payment_method: paymentIntent.payment_method_types[0],
      completed_at: new Date().toISOString(),
    })

    // Create enrollment
    await supabase.from("enrollments").upsert({
      user_id: userId,
      course_id: parseInt(courseId),
      status: "active",
      progress: 0,
    })
  }

  return NextResponse.json({ received: true })
}

