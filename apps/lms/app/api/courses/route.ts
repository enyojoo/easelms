import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const recommended = searchParams.get("recommended") === "true"
    const ids = searchParams.get("ids")
    const allCourses = searchParams.get("all") === "true" // Admin/instructor can fetch all courses

    // For public course listing, we don't need authentication
    // Use service role client to bypass RLS and avoid recursion issues
    const { createServiceRoleClient, createClient } = await import("@/lib/supabase/server")
    
    let supabase
    let serviceClient
    let isAdmin = false
    let isInstructor = false

    // If all=true, check if user is admin/instructor
    if (allCourses) {
      const regularClient = await createClient()
      const { data: { user } } = await regularClient.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      // Use service role client to bypass RLS when checking admin status
      try {
        serviceClient = createServiceRoleClient()
      } catch (serviceError: any) {
        console.warn("Service role key not available, using regular client:", serviceError.message)
        serviceClient = null
      }

      const clientToUse = serviceClient || regularClient

      // Check if user is admin or instructor
      const { data: profile } = await clientToUse
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single()

      if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      isAdmin = profile?.user_type === "admin"
      isInstructor = profile?.user_type === "instructor"
      supabase = serviceClient || regularClient
    } else {
      // Public access - use service role client to bypass RLS
      try {
        supabase = createServiceRoleClient()
      } catch (serviceError: any) {
        // If service role not available, use regular client (might have RLS issues)
        supabase = await createClient()
        console.warn("Courses API: Service role not available, using regular client")
      }
    }

    // Fetch courses with lesson counts and duration
    // Try to include lessons count, but fallback to basic query if RLS blocks it
    let query = supabase
      .from("courses")
      .select(`
        *,
        lessons (id, video_url, text_content, estimated_duration)
      `)

    // Only filter by is_published if not fetching all courses
    if (!allCourses) {
      query = query.eq("is_published", true)
    }

    if (ids) {
      // Filter by specific course IDs
      const courseIds = ids.split(',').map(id => parseInt(id.trim()))
      query = query.in("id", courseIds)
    } else if (recommended) {
      // For recommended courses, return recently published courses
      query = query
        .order("created_at", { ascending: false })
        .limit(4)
    } else {
      query = query.order("created_at", { ascending: false })
    }

    let { data, error } = await query

    // If error with lessons relation, try with a simpler lessons selection
    if (error) {
      console.warn("Courses API: Error with lessons relation, trying with simpler select:", error.message)
      let basicQuery = supabase
        .from("courses")
        .select(`
          *,
          lessons (id, content)
        `)

      // Only filter by is_published if not fetching all courses
      if (!allCourses) {
        basicQuery = basicQuery.eq("is_published", true)
      }

      if (ids) {
        const courseIds = ids.split(',').map(id => parseInt(id.trim()))
        basicQuery = basicQuery.in("id", courseIds)
      } else if (recommended) {
        basicQuery = basicQuery
          .order("created_at", { ascending: false })
          .limit(4)
      } else {
        basicQuery = basicQuery.order("created_at", { ascending: false })
      }

      const { data: basicData, error: basicError } = await basicQuery
      
      if (!basicError) {
        data = basicData
        error = null
      } else {
        error = basicError
      }
    }

    if (error) {
      console.error("Courses API: Database error", {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        recommended,
        ids,
      })
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
      }, { status: 500 })
    }

    // Process courses to ensure they have the expected structure
    const processedCourses = (data || []).map((course: any) => {
      // Ensure lessons is an array (either from relation or empty array)
      const lessons = Array.isArray(course.lessons) ? course.lessons : []
      
      // Calculate total duration from lessons
      // Duration is stored in lesson.content.estimatedDuration
      const totalDurationMinutes = lessons.reduce((total: number, lesson: any) => {
        const estimatedDuration = lesson.content?.estimatedDuration || 0
        return total + estimatedDuration
      }, 0)
      const totalHours = Math.round((totalDurationMinutes / 60) * 10) / 10 // Round to 1 decimal place
      
      // Parse settings if it's a string (JSON stored as text)
      let settings = course.settings
      if (typeof settings === 'string') {
        try {
          settings = JSON.parse(settings)
        } catch (e) {
          console.warn("Failed to parse course settings:", e)
          settings = {}
        }
      }

      return {
        ...course,
        lessons: lessons, // Ensure lessons is always an array
        settings: {
          ...(settings || {}),
          enrollment: {
            enrollmentMode: course.enrollment_mode || "free",
            price: course.price || undefined,
            recurringPrice: course.recurring_price || undefined,
          },
        }, // Ensure settings exists with enrollment data
        totalDurationMinutes: totalDurationMinutes,
        totalHours: totalHours,
        // Map database fields to expected structure
        image: course.image || course.thumbnail || "/placeholder.svg",
        description: course.description || "",
        price: course.price || 0,
      }
    })

    return NextResponse.json({ courses: processedCourses })
  } catch (error: any) {
    console.error("Courses API: Unexpected error", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json({ 
      error: error?.message || "An unexpected error occurred while fetching courses",
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  if (profile?.user_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const courseData = await request.json()

  const { data, error } = await supabase
    .from("courses")
    .insert({
      ...courseData,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ course: data })
}

