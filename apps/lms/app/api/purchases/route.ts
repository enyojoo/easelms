import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const allPurchases = searchParams.get("all") === "true" // Admin can fetch all purchases

    // Use service role client to bypass RLS for admin check
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (e) {
      // Fallback to regular client
    }

    const clientToUse = serviceClient || supabase

    // Check if user is admin/instructor
    const { data: profile } = await clientToUse
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    const isAdmin = profile?.user_type === "admin"
    const isInstructor = profile?.user_type === "instructor"

    // If userId is provided and user is admin/instructor, allow fetching other users' purchases
    // If allPurchases is true and user is admin, fetch all purchases
    let targetUserId: string | null = null
    if (allPurchases && isAdmin) {
      targetUserId = null // Fetch all purchases
    } else if (userId && userId !== user.id) {
      if (!isAdmin && !isInstructor) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      targetUserId = userId
    } else {
      targetUserId = user.id
    }

    // Try to fetch purchases with courses and user relation
    let query = clientToUse
      .from("payments")
      .select(`
        *,
        courses (
          id,
          title,
          image
        ),
        profiles:user_id (
          id,
          name,
          email
        )
      `)

    // If targetUserId is null, fetch all purchases (admin only)
    if (targetUserId === null) {
      query = query.order("created_at", { ascending: false })
    } else {
      query = query.eq("user_id", targetUserId).order("created_at", { ascending: false })
    }

    let { data: purchases, error } = await query

    // If error with relations, try without them
    if (error) {
      logWarning("Purchases API: Error with relations, trying without", {
        component: "purchases/route",
        action: "GET",
        error: error.message,
        userId: targetUserId,
      })
      let fallbackQuery = clientToUse
        .from("payments")
        .select("*")

      if (targetUserId !== null) {
        fallbackQuery = fallbackQuery.eq("user_id", targetUserId)
      }

      const { data: paymentsData, error: paymentsError } = await fallbackQuery
        .order("created_at", { ascending: false })

      if (!paymentsError) {
        purchases = paymentsData
        error = null
      } else {
        error = paymentsError
      }
    }

    if (error) {
      logError("Purchases API: Database error", error, {
        component: "purchases/route",
        action: "GET",
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId: targetUserId,
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
      amount: payment.amount || payment.amount_usd || 0,
      currency: payment.currency || "USD",
      gateway: payment.gateway || "stripe",
      status: payment.status || "pending",
      type: payment.recurring_price ? "recurring" : "one-time",
      recurringPrice: payment.recurring_price,
      purchasedAt: payment.created_at || payment.completed_at,
      createdAt: payment.created_at,
      completedAt: payment.completed_at,
      cancelledAt: payment.cancelled_at,
      userId: payment.user_id,
      userName: payment.profiles?.name,
      userEmail: payment.profiles?.email,
      transactionId: payment.transaction_id,
    }))

    return NextResponse.json({ purchases: formattedPurchases })
  } catch (error: any) {
    logError("Purchases API: Unexpected error", error, {
      component: "purchases/route",
      action: "GET",
    })
    return NextResponse.json({ 
      error: error?.message || "An unexpected error occurred while fetching purchases",
    }, { status: 500 })
  }
}

