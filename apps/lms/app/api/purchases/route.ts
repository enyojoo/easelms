import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    // If userId is provided and user is admin, allow fetching other users' purchases
    const targetUserId = userId || user.id

    // Check if user is admin if trying to fetch another user's purchases
    if (userId && userId !== user.id) {
      // Use service role client to bypass RLS for admin check
      let serviceClient
      try {
        serviceClient = createServiceRoleClient()
      } catch (e) {
        // Fallback to regular client
      }

      const clientToUse = serviceClient || supabase
      const { data: profile } = await clientToUse
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single()

      if (profile?.user_type !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Try to fetch purchases with courses relation
    // Use service role client to bypass RLS if available
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (e) {
      // Service role not available, use regular client
    }

    const clientToUse = serviceClient || supabase

    let { data: purchases, error } = await clientToUse
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

    // If error with courses relation, try without it
    if (error) {
      console.warn("Purchases API: Error with courses relation, trying without:", error.message)
      const { data: paymentsData, error: paymentsError } = await clientToUse
        .from("payments")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })

      if (!paymentsError) {
        purchases = paymentsData
        error = null
      } else {
        error = paymentsError
      }
    }

    if (error) {
      console.error("Purchases API: Database error", {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
      }, { status: 500 })
    }

    // Format purchases to match expected structure
    const formattedPurchases = (purchases || []).map((payment: any) => ({
      id: payment.id,
      courseId: payment.course_id,
      courseTitle: payment.courses?.title || "Unknown Course",
      courseImage: payment.courses?.image,
      amount: payment.amount || 0,
      currency: payment.currency || "USD",
      gateway: payment.gateway || "stripe",
      status: payment.status === "completed" ? "active" : payment.status || "pending",
      type: payment.recurring_price ? "recurring" : "one-time",
      recurringPrice: payment.recurring_price,
      purchasedAt: payment.created_at || payment.completed_at,
      createdAt: payment.created_at,
      completedAt: payment.completed_at,
      cancelledAt: payment.cancelled_at,
    }))

    return NextResponse.json({ purchases: formattedPurchases })
  } catch (error: any) {
    console.error("Purchases API: Unexpected error", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json({ 
      error: error?.message || "An unexpected error occurred while fetching purchases",
    }, { status: 500 })
  }
}

