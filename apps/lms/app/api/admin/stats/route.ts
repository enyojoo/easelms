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

    // Only calculate revenue for admins (instructors should not see revenue)
    const totalRevenue = isAdmin 
      ? (payments?.reduce((sum, payment) => sum + (payment.amount_usd || 0), 0) || 0)
      : 0

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
          updated_at,
          user_id,
          course_id
        `)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(5),

      isAdmin
        ? adminClient
            .from("payments")
            .select(`
              id,
              created_at,
              amount_usd,
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
      console.error("Error fetching enrollments:", enrollmentsData.error)
    }

    // Ensure we have valid enrollment data
    const validEnrollmentsData = enrollmentsData.error ? { data: [] } : enrollmentsData

    // Fetch user names and course titles for enrollments
    const enrollmentUserIds = (validEnrollmentsData.data || []).map((e: any) => e.user_id).filter(Boolean)
    const enrollmentCourseIds = (validEnrollmentsData.data || []).map((e: any) => e.course_id).filter(Boolean)
    
    console.log("Enrollment IDs - Users:", enrollmentUserIds.length, "Courses:", enrollmentCourseIds.length)
    
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
      console.error("Error fetching enrollment users:", enrollmentUsers.error)
    }
    if (enrollmentCourses.error) {
      console.error("Error fetching enrollment courses:", enrollmentCourses.error)
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

    console.log("Mapped enrollments:", enrollments.data.length, "records")

    // Fetch user names and course titles for completions
    const completionUserIds = completionsData.data?.map(e => e.user_id).filter(Boolean) || []
    const completionCourseIds = completionsData.data?.map(e => e.course_id).filter(Boolean) || []
    
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
      data: completionsData.data?.map(e => ({
        ...e,
        profiles: { name: completionUserMap.get(e.user_id) || "Unknown User" },
        courses: { title: completionCourseMap.get(e.course_id) || "Unknown Course" }
      })) || []
    }

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

    console.log("Enrollment activities created:", enrollmentActivities.length)

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
        time: new Date(e.updated_at).toISOString(),
        timestamp: new Date(e.updated_at).getTime()
      })) || []),
      // Only include payment activities for admins
      ...(isAdmin ? (paymentsWithData.data?.map((p: any) => ({
        id: `payment-${p.id}`,
        type: "payment" as const,
        user: p.profiles?.name || "Unknown User",
        course: p.courses?.title || "Unknown Course",
        amount: `$${p.amount_usd}`,
        time: new Date(p.created_at).toISOString(),
        timestamp: new Date(p.created_at).getTime()
      })) || []) : [])
    ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)

    console.log("Total recent activity items:", recentActivity.length, "Enrollments:", enrollmentActivities.length)

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
