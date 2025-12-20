import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Use service role client to bypass RLS when checking admin status
  let serviceClient
  try {
    serviceClient = createServiceRoleClient()
  } catch (serviceError: any) {
    console.warn("Service role key not available, using regular client:", serviceError.message)
    serviceClient = null
  }

  // Try to fetch profile using service role client first (bypasses RLS)
  let profile = null
  let error = null

  if (serviceClient) {
    const { data, error: profileError } = await serviceClient
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()
    
    profile = data
    error = profileError
  } else {
    // Fallback to regular client if service role not available
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()
    
    profile = data
    error = profileError
  }

  if (error) {
    console.error("Error fetching profile for admin check:", error)
    return NextResponse.json({ error: "Failed to verify admin status" }, { status: 500 })
  }

  if (profile?.user_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // Use service role client for admin queries to bypass RLS
    const adminClient = serviceClient || supabase

    // Get total courses count (only published courses)
    const { count: totalCourses, error: coursesError } = await adminClient
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)

    if (coursesError) {
      console.error("Error fetching courses:", coursesError)
      throw coursesError
    }

    // Get total learners count (users with user_type = 'user')
    const { count: totalLearners, error: learnersError } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_type", "user")

    if (learnersError) {
      console.error("Error fetching learners:", learnersError)
      throw learnersError
    }

    // Get total revenue from completed payments
    const { data: payments, error: paymentsError } = await adminClient
      .from("payments")
      .select("amount_usd")
      .eq("status", "completed")

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError)
      throw paymentsError
    }

    const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount_usd || 0), 0) || 0

    // Get recent activity (last 10 items from enrollments, course completions, payments)
    // Use admin client to bypass RLS
    const [enrollments, completions, recentPayments] = await Promise.all([
      adminClient
        .from("enrollments")
        .select(`
          id,
          created_at,
          profiles:user_id (name),
          courses:course_id (title)
        `)
        .order("created_at", { ascending: false })
        .limit(5),

      adminClient
        .from("enrollments")
        .select(`
          id,
          updated_at,
          profiles:user_id (name),
          courses:course_id (title)
        `)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(5),

      adminClient
        .from("payments")
        .select(`
          id,
          created_at,
          amount_usd,
          profiles:user_id (name),
          courses:course_id (title)
        `)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5)
    ])

    // Combine and sort recent activity
    const recentActivity = [
      ...(enrollments.data?.map(e => ({
        id: `enrollment-${e.id}`,
        type: "enrollment" as const,
        user: e.profiles?.name || "Unknown User",
        course: e.courses?.title || "Unknown Course",
        time: new Date(e.created_at).toISOString(),
        timestamp: new Date(e.created_at).getTime()
      })) || []),
      ...(completions.data?.map(e => ({
        id: `completion-${e.id}`,
        type: "completion" as const,
        user: e.profiles?.name || "Unknown User",
        course: e.courses?.title || "Unknown Course",
        time: new Date(e.updated_at).toISOString(),
        timestamp: new Date(e.updated_at).getTime()
      })) || []),
      ...(recentPayments.data?.map(p => ({
        id: `payment-${p.id}`,
        type: "payment" as const,
        user: p.profiles?.name || "Unknown User",
        course: p.courses?.title || "Unknown Course",
        amount: `$${p.amount_usd}`,
        time: new Date(p.created_at).toISOString(),
        timestamp: new Date(p.created_at).getTime()
      })) || [])
    ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)

    return NextResponse.json({
      totalCourses: totalCourses || 0,
      totalLearners: totalLearners || 0,
      totalRevenue: totalRevenue,
      recentActivity: recentActivity
    })

  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
