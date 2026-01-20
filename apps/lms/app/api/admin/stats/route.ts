import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

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
    logWarning("Service role key not available, using regular client", {
      component: "admin/stats/route",
      action: "GET",
      error: serviceError.message,
    })
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
    logError("Error fetching profile for admin check", error, {
      component: "admin/stats/route",
      action: "GET",
      userId: user.id,
    })
    return NextResponse.json({ error: "Failed to verify admin status" }, { status: 500 })
  }

  // Allow both admin and instructor access
  if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  const isAdmin = profile?.user_type === "admin"

  try {
    // Use service role client for admin queries to bypass RLS
    const adminClient = serviceClient || supabase

    // Get total courses count (only published courses)
    const { count: totalCourses, error: coursesError } = await adminClient
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)

    if (coursesError) {
      logError("Error fetching courses", coursesError, {
        component: "admin/stats/route",
        action: "GET",
      })
      throw coursesError
    }

    // Get total learners count (users with user_type = 'user')
    const { count: totalLearners, error: learnersError } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_type", "user")

    if (learnersError) {
      logError("Error fetching learners", learnersError, {
        component: "admin/stats/route",
        action: "GET",
      })
      throw learnersError
    }

    // Get admin's default currency from platform settings
    let adminCurrency = "USD"
    if (isAdmin) {
      try {
        const { data: platformSettings } = await adminClient
          .from("platform_settings")
          .select("default_currency")
          .single()

        if (platformSettings?.default_currency) {
          adminCurrency = platformSettings.default_currency
        }
      } catch (settingsError) {
        // If platform_settings doesn't exist or error, use USD as default
        logWarning("Could not fetch admin currency, using USD", {
          component: "admin/stats/route",
          action: "GET",
          error: settingsError.message,
        })
      }
    }

    // Get total revenue from completed/successful payments
    const { data: payments, error: paymentsError } = await adminClient
      .from("payments")
      .select("payment_amount, payment_currency, exchange_rate, status")
      .in("status", ["completed", "successful"])

    if (paymentsError) {
      logError("Error fetching payments", paymentsError, {
        component: "admin/stats/route",
        action: "GET",
      })
      throw paymentsError
    }

    // Only calculate revenue for admins (instructors should not see revenue)
    // Calculate revenue in admin's default currency using exchange rates
    const totalRevenue = isAdmin
      ? (payments?.reduce((sum, payment) => {
          // All payments have exchange_rate = payment_amount / usd_equivalent
          // So to get USD equivalent: payment_amount / exchange_rate
          const usdEquivalent = payment.payment_amount / (payment.exchange_rate || 1)

          // Convert USD to admin currency
          let convertedAmount = usdEquivalent
          if (adminCurrency === "NGN") {
            // Convert USD to NGN using current approximate rate
            // This is a simplification - in production, you'd want real exchange rates
            const USD_TO_NGN_RATE = 1000 // Approximate: 1 USD = 1000 NGN
            convertedAmount = usdEquivalent * USD_TO_NGN_RATE
          }
          // For USD, usdEquivalent is already in USD

          return sum + convertedAmount
        }, 0) || 0)
      : 0

    // Get total completed courses count (enrollments with status = 'completed')
    const { count: totalCompleted, error: completedError } = await adminClient
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")

    if (completedError) {
      logError("Error fetching completed enrollments", completedError, {
        component: "admin/stats/route",
        action: "GET",
      })
      // Don't throw, just log the error and use 0 as default
    }

    // Get recent activity (last 5 items from user signups, enrollments, course completions, payments)
    // Use admin client to bypass RLS
    const [recentSignups, enrollmentsData, completionsData, recentPayments] = await Promise.all([
      adminClient
        .from("profiles")
        .select(`
          id,
          created_at,
          name,
          email
        `)
        .eq("user_type", "user")
        .order("created_at", { ascending: false })
        .limit(5),

      adminClient
        .from("enrollments")
        .select(`
          id,
          enrolled_at,
          user_id,
          course_id
        `)
        .order("enrolled_at", { ascending: false })
        .limit(5),

      adminClient
        .from("enrollments")
        .select(`
          id,
          completed_at,
          updated_at,
          user_id,
          course_id
        `)
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5),

      isAdmin
        ? adminClient
        .from("payments")
        .select(`
          id,
          created_at,
          payment_amount,
          payment_currency,
              user_id,
              course_id
        `)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5)
        : Promise.resolve({ data: [] })
    ])

    // Check for errors in enrollments query
    if (enrollmentsData.error) {
      logError("Error fetching enrollments", enrollmentsData.error, {
        component: "admin/stats/route",
        action: "GET",
      })
    }

    // Check for errors in completions query
    if (completionsData.error) {
      logError("Error fetching completions", completionsData.error, {
        component: "admin/stats/route",
        action: "GET",
      })
    }

    // Ensure we have valid enrollment data
    const validEnrollmentsData = enrollmentsData.error ? { data: [] } : enrollmentsData
    
    // Ensure we have valid completions data
    const validCompletionsData = completionsData.error ? { data: [] } : completionsData

    // Fetch user names and course titles for enrollments
    const enrollmentUserIds = (validEnrollmentsData.data || []).map((e: any) => e.user_id).filter(Boolean)
    const enrollmentCourseIds = (validEnrollmentsData.data || []).map((e: any) => e.course_id).filter(Boolean)
    
    logInfo("Enrollment IDs", { users: enrollmentUserIds.length, courses: enrollmentCourseIds.length })
    
    const [enrollmentUsers, enrollmentCourses] = await Promise.all([
      enrollmentUserIds.length > 0
        ? adminClient
            .from("profiles")
            .select("id, name")
            .in("id", enrollmentUserIds)
        : Promise.resolve({ data: [] }),
      enrollmentCourseIds.length > 0
        ? adminClient
            .from("courses")
            .select("id, title")
            .in("id", enrollmentCourseIds)
        : Promise.resolve({ data: [] })
    ])

    // Check for errors in user/course queries
    if (enrollmentUsers.error) {
      logError("Error fetching enrollment users", enrollmentUsers.error, {
        component: "admin/stats/route",
        action: "GET",
      })
    }
    if (enrollmentCourses.error) {
      logError("Error fetching enrollment courses", enrollmentCourses.error, {
        component: "admin/stats/route",
        action: "GET",
      })
    }

    // Create maps for quick lookup
    const userMap = new Map((enrollmentUsers.data || []).map((u: any) => [u.id, u.name]))
    const courseMap = new Map((enrollmentCourses.data || []).map((c: any) => [c.id, c.title]))

    // Map enrollments with user and course names
    const enrollments = {
      data: (validEnrollmentsData.data || []).map((e: any) => ({
        ...e,
        profiles: { name: userMap.get(e.user_id) || "Unknown User" },
        courses: { title: courseMap.get(e.course_id) || "Unknown Course" }
      }))
    }

    logInfo("Mapped enrollments", { count: enrollments.data.length })

    // Fetch user names and course titles for completions
    const completionUserIds = (validCompletionsData.data || []).map(e => e.user_id).filter(Boolean)
    const completionCourseIds = (validCompletionsData.data || []).map(e => e.course_id).filter(Boolean)
    
    const [completionUsers, completionCourses] = await Promise.all([
      completionUserIds.length > 0
        ? adminClient
            .from("profiles")
            .select("id, name")
            .in("id", completionUserIds)
        : Promise.resolve({ data: [] }),
      completionCourseIds.length > 0
        ? adminClient
            .from("courses")
            .select("id, title")
            .in("id", completionCourseIds)
        : Promise.resolve({ data: [] })
    ])

    // Create maps for completions
    const completionUserMap = new Map(completionUsers.data?.map(u => [u.id, u.name]) || [])
    const completionCourseMap = new Map(completionCourses.data?.map(c => [c.id, c.title]) || [])

    // Map completions with user and course names
    const completions = {
      data: (validCompletionsData.data || []).map(e => ({
        ...e,
        profiles: { name: completionUserMap.get(e.user_id) || "Unknown User" },
        courses: { title: completionCourseMap.get(e.course_id) || "Unknown Course" }
      }))
    }
    
    logInfo("Completions data", {
      rawCount: validCompletionsData.data?.length || 0,
      mappedCount: completions.data.length,
      sample: completions.data[0]
    })

    // Fetch user names and course titles for payments (only if admin)
    let paymentsWithData = { data: [] as any[] }
    if (isAdmin && recentPayments.data && recentPayments.data.length > 0) {
      const paymentUserIds = recentPayments.data.map(p => p.user_id).filter(Boolean)
      const paymentCourseIds = recentPayments.data.map(p => p.course_id).filter(Boolean)
      
      const [paymentUsers, paymentCourses] = await Promise.all([
        paymentUserIds.length > 0
          ? adminClient
              .from("profiles")
              .select("id, name")
              .in("id", paymentUserIds)
          : Promise.resolve({ data: [] }),
        paymentCourseIds.length > 0
          ? adminClient
              .from("courses")
              .select("id, title")
              .in("id", paymentCourseIds)
          : Promise.resolve({ data: [] })
      ])

      const paymentUserMap = new Map(paymentUsers.data?.map(u => [u.id, u.name]) || [])
      const paymentCourseMap = new Map(paymentCourses.data?.map(c => [c.id, c.title]) || [])

      paymentsWithData = {
        data: recentPayments.data.map(p => ({
          ...p,
          profiles: { name: paymentUserMap.get(p.user_id) || "Unknown User" },
          courses: { title: paymentCourseMap.get(p.course_id) || "Unknown Course" }
        }))
      }
    }

    // Combine and sort recent activity
    const enrollmentActivities = (enrollments.data || []).map((e: any) => ({
      id: `enrollment-${e.id}`,
      type: "enrollment" as const,
      user: e.profiles?.name || "Unknown User",
      course: e.courses?.title || "Unknown Course",
      time: new Date(e.enrolled_at).toISOString(),
      timestamp: new Date(e.enrolled_at).getTime()
    }))

    logInfo("Enrollment activities created", { count: enrollmentActivities.length })

    const recentActivity = [
      ...(recentSignups.data?.map(u => ({
        id: `signup-${u.id}`,
        type: "signup" as const,
        user: u.name || u.email || "Unknown User",
        course: "", // Signups don't have a course
        time: new Date(u.created_at).toISOString(),
        timestamp: new Date(u.created_at).getTime()
      })) || []),
      ...enrollmentActivities,
      ...(completions.data?.map((e: any) => ({
        id: `completion-${e.id}`,
        type: "completion" as const,
        user: e.profiles?.name || "Unknown User",
        course: e.courses?.title || "Unknown Course",
        time: new Date(e.completed_at || e.updated_at).toISOString(),
        timestamp: new Date(e.completed_at || e.updated_at).getTime()
      })) || []),
      // Only include payment activities for admins
      ...(isAdmin ? (paymentsWithData.data?.map((p: any) => ({
        id: `payment-${p.id}`,
        type: "payment" as const,
        user: p.profiles?.name || "Unknown User",
        course: p.courses?.title || "Unknown Course",
        amount: `${p.payment_amount} ${p.payment_currency}`,
        time: new Date(p.created_at).toISOString(),
        timestamp: new Date(p.created_at).getTime()
      })) || []) : [])
    ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)

    logInfo("Total recent activity items", { total: recentActivity.length, enrollments: enrollmentActivities.length })

    return NextResponse.json({
      totalCourses: totalCourses || 0,
      totalLearners: totalLearners || 0,
      totalRevenue: totalRevenue,
      revenueCurrency: isAdmin ? adminCurrency : "USD",
      totalCompleted: totalCompleted || 0,
      recentActivity: recentActivity
    })

  } catch (error) {
    logError("Error fetching admin stats", error, {
      component: "admin/stats/route",
      action: "GET",
    })
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
