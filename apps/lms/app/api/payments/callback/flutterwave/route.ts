import { createClient } from "@/lib/supabase/server"
import { verifyTransaction } from "@/lib/payments/flutterwave"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const transactionId = searchParams.get("transaction_id")
  const txRef = searchParams.get("tx_ref")

  if (!transactionId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/learner/courses?error=payment_failed`)
  }

  try {
    const verification = await verifyTransaction(transactionId)

    if (verification.status === "success" && verification.data.status === "successful") {
      const supabase = await createClient()
      const { userId, courseId, amountUSD } = verification.data.meta

      // Create payment record
      await supabase.from("payments").insert({
        user_id: userId,
        course_id: parseInt(courseId),
        amount_usd: parseFloat(amountUSD),
        amount: verification.data.amount,
        currency: verification.data.currency,
        exchange_rate: verification.data.amount / parseFloat(amountUSD),
        gateway: "flutterwave",
        status: "completed",
        transaction_id: transactionId,
        payment_method: verification.data.payment_type,
        completed_at: new Date().toISOString(),
      })

      // Create enrollment
      await supabase.from("enrollments").upsert({
        user_id: userId,
        course_id: parseInt(courseId),
        status: "active",
        progress: 0,
      })

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/learner/courses?success=payment_completed`)
    }
  } catch (error) {
    console.error("Flutterwave verification error:", error)
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/learner/courses?error=payment_failed`)
}

