import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  // If userId is provided and user is admin, allow fetching other users' purchases
  const targetUserId = userId || user.id

  // Check if user is admin if trying to fetch another user's purchases
  if (userId && userId !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const { data: purchases, error } = await supabase
    .from("payments")
    .select(`
      *,
      courses (
        id,
        title,
        image
      )
    `)
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Format purchases to match expected structure
  const formattedPurchases = purchases?.map((payment) => ({
    id: payment.id,
    courseId: payment.course_id,
    courseTitle: payment.courses?.title || "Unknown Course",
    courseImage: payment.courses?.image,
    amount: payment.amount,
    currency: payment.currency,
    gateway: payment.gateway,
    status: payment.status,
    type: payment.recurring_price ? "subscription" : "one-time",
    recurringPrice: payment.recurring_price,
    createdAt: payment.created_at,
    completedAt: payment.completed_at,
    cancelledAt: payment.cancelled_at,
  })) || []

  return NextResponse.json({ purchases: formattedPurchases })
}

