import { createClient } from "@/lib/supabase/server"
import { createPaymentIntent } from "@/lib/payments/stripe"
import { initializePayment } from "@/lib/payments/flutterwave"
import { convertCurrency } from "@/lib/payments/currency"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { courseId, amountUSD } = await request.json()

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

  try {
    if (gateway === "stripe") {
      const paymentIntent = await createPaymentIntent(convertedAmount, userCurrency, {
        userId: user.id,
        courseId: courseId.toString(),
        amountUSD: amountUSD.toString(),
      })

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        gateway: "stripe",
        amount: convertedAmount,
        currency: userCurrency,
        exchangeRate,
      })
    } else {
      // Flutterwave
      const txRef = `tx_${Date.now()}_${user.id}`
      const payment = await initializePayment({
        amount: convertedAmount,
        currency: userCurrency,
        email: user.email!,
        tx_ref: txRef,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback/flutterwave`,
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

