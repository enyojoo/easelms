import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  if (!id) {
    return NextResponse.json({ error: "Learner ID is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Use service role client to bypass RLS when checking admin status
  let serviceClient
  try {
    serviceClient = createServiceRoleClient()
  } catch (serviceError: any) {
    logWarning("Service role key not available, using regular client", {
      component: "learners/[id]/purchases/route",
      action: "GET",
      error: serviceError.message,
    })
    serviceClient = null
  }

  // Try to fetch profile using service role client first (bypasses RLS)
  let profile = null
  let profileError = null

  if (serviceClient) {
    const { data, error: err } = await serviceClient
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()
    
    profile = data
    profileError = err
  } else {
    // Fallback to regular client if service role not available
    const { data, error: err } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()
    
    profile = data
    profileError = err
  }

  if (profileError) {
    logError("Error fetching profile for admin check", profileError, {
      component: "learners/[id]/purchases/route",
      action: "GET",
      userId: user.id,
      learnerId: id,
    })
    return NextResponse.json({ error: "Failed to verify admin status" }, { status: 500 })
  }

  // Allow both admin and instructor access
  if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Use service role client for admin queries to bypass RLS
  const adminClient = serviceClient || supabase

  const { data: purchases, error } = await adminClient
    .from("payments")
    .select(`
      *,
      courses (
        id,
        title,
        image
      )
    `)
    .eq("user_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Format purchases to match expected structure
  const formattedPurchases = purchases?.map((payment: any) => ({
    id: payment.id,
    courseId: payment.course_id,
    courseTitle: payment.courses?.title || "Unknown Course",
    courseImage: payment.courses?.image,
    amount: payment.payment_amount || payment.amount || payment.amount_usd || 0,
    currency: payment.currency || "USD",
    gateway: payment.gateway,
    status: payment.status,
    type: payment.recurring_price ? "recurring" : "one-time",
    recurringPrice: payment.recurring_price,
    purchasedAt: payment.created_at || payment.completed_at,
    completedAt: payment.completed_at,
    cancelledAt: payment.cancelled_at,
  })) || []

  return NextResponse.json({ purchases: formattedPurchases })
}

