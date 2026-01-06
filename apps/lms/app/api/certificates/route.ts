import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

// Route segment config
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    // If userId is provided and user is admin, allow fetching other users' certificates
    const targetUserId = userId || user.id

    // Check if user is admin if trying to fetch another user's certificates
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

    // Try to fetch certificates with courses relation
    // Use service role client to bypass RLS if available
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (e) {
      // Service role not available, use regular client
    }

    const clientToUse = serviceClient || supabase

    let { data: certificates, error } = await clientToUse
      .from("certificates")
      .select(`
        *,
        courses (
          id,
          title
        )
      `)
      .eq("user_id", targetUserId)
      .order("issued_at", { ascending: false })

    // If error with courses relation, try without it
    if (error) {
      logWarning("Certificates API: Error with courses relation, trying without", {
        component: "certificates/route",
        action: "GET",
        error: error.message,
        userId: targetUserId,
      })
      const { data: certsData, error: certsError } = await clientToUse
        .from("certificates")
        .select("*")
        .eq("user_id", targetUserId)
        .order("issued_at", { ascending: false })

      if (!certsError) {
        certificates = certsData
        error = null
      } else {
        error = certsError
      }
    }

    if (error) {
      logError("Certificates API: Database error", error, {
        component: "certificates/route",
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

    // Format certificates to match expected structure
    const formattedCertificates = (certificates || []).map((cert: any) => ({
      id: cert.id,
      certificateNumber: cert.certificate_number || cert.certificateNumber || `CERT-${cert.id}`,
      courseId: cert.course_id,
      courseTitle: cert.courses?.title || "Unknown Course",
      issuedAt: cert.issued_at || cert.issuedAt,
      certificateType: cert.certificate_type || cert.certificateType || "completion",
    }))

    return NextResponse.json({ certificates: formattedCertificates })
  } catch (error: any) {
    logError("Certificates API: Unexpected error", error, {
      component: "certificates/route",
      action: "GET",
    })
    return NextResponse.json({ 
      error: error?.message || "An unexpected error occurred while fetching certificates",
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("[Certificates API] POST request received")
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[Certificates API] Unauthorized:", authError?.message)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { courseId } = body

    console.log("[Certificates API] Request body:", { courseId, courseIdType: typeof courseId })

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 })
    }

    // Ensure courseId is a number
    const numericCourseId = typeof courseId === "string" ? parseInt(courseId, 10) : courseId
    
    if (isNaN(numericCourseId)) {
      console.log("[Certificates API] Invalid courseId format:", courseId)
      return NextResponse.json({ error: "Invalid courseId format" }, { status: 400 })
    }

    console.log("[Certificates API] Creating certificate for:", { userId: user.id, courseId: numericCourseId })

    logInfo("Certificates API POST: Creating certificate", {
      userId: user.id,
      courseId: numericCourseId,
    })

    // Use service role client to bypass RLS
    const serviceSupabase = createServiceRoleClient()

    // Get course details first to verify it exists
    // Query flat columns only (database doesn't have settings JSONB column)
    let course, courseError
    try {
      const { data: courseData, error: courseErr } = await serviceSupabase
        .from("courses")
        .select(`
          id, 
          title, 
          certificate_enabled,
          certificate_type,
          certificate_title,
          certificate_description,
          certificate_template,
          signature_image,
          signature_name,
          signature_title,
          additional_text
        `)
        .eq("id", numericCourseId)
        .single()
      
      course = courseData
      courseError = courseErr
    } catch (err: any) {
      courseError = err
      logError("Certificates API POST: Exception querying course", err, {
        component: "certificates/route",
        action: "POST",
        userId: user.id,
        courseId: numericCourseId,
      })
    }

    if (courseError) {
      console.error("[Certificates API] Course query error:", {
        courseId: numericCourseId,
        error: courseError,
        code: (courseError as any)?.code,
        message: (courseError as any)?.message,
        details: (courseError as any)?.details,
      })
      logError("Certificates API POST: Course query error", courseError, {
        component: "certificates/route",
        action: "POST",
        userId: user.id,
        courseId: numericCourseId,
        courseIdType: typeof numericCourseId,
        courseErrorCode: (courseError as any)?.code,
        courseErrorMessage: (courseError as any)?.message,
        courseErrorDetails: (courseError as any)?.details,
      })
      return NextResponse.json({ 
        error: "Course not found",
        details: (courseError as any)?.message || "Unable to fetch course information"
      }, { status: 404 })
    }

    if (!course) {
      console.error("[Certificates API] Course not found (null result) for courseId:", numericCourseId)
      logError("Certificates API POST: Course not found (null result)", new Error("Course query returned null"), {
        component: "certificates/route",
        action: "POST",
        userId: user.id,
        courseId: numericCourseId,
      })
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    console.log("[Certificates API] Course found:", { courseId: course.id, title: course.title })

    // Check if certificate already exists
    const { data: existingCert } = await serviceSupabase
      .from("certificates")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", numericCourseId)
      .single()

    if (existingCert) {
      return NextResponse.json({ 
        certificate: { id: existingCert.id },
        message: "Certificate already exists"
      })
    }

    // Check if course is completed
    const { data: enrollment, error: enrollmentError } = await serviceSupabase
      .from("enrollments")
      .select("status, completed_at")
      .eq("user_id", user.id)
      .eq("course_id", numericCourseId)
      .single()

    if (enrollmentError) {
      logError("Certificates API POST: Enrollment error", enrollmentError, {
        component: "certificates/route",
        action: "POST",
        userId: user.id,
        courseId: numericCourseId,
      })
    }

    if (!enrollment || enrollment.status !== "completed") {
      return NextResponse.json({ 
        error: "Course must be completed before certificate can be issued"
      }, { status: 400 })
    }

    // Check if certificate is enabled for this course
    // Use flat column directly (database stores as certificate_enabled, not in settings JSONB)
    const certificateEnabled = course.certificate_enabled || false

    if (!certificateEnabled) {
      return NextResponse.json({ 
        error: "Certificate is not enabled for this course"
      }, { status: 400 })
    }

    // Generate certificate number
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create certificate
    // Note: certificate_type is stored in courses table, not certificates table
    const { data: certificate, error: insertError } = await serviceSupabase
      .from("certificates")
      .insert({
        user_id: user.id,
        course_id: numericCourseId,
        course_title: course.title, // Required field in certificates table
        certificate_number: certificateNumber,
        issued_at: enrollment.completed_at || new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      logError("Certificates API POST: Database error", insertError, {
        component: "certificates/route",
        action: "POST",
        userId: user.id,
        courseId: numericCourseId,
      })
      return NextResponse.json({ 
        error: insertError.message,
        details: insertError.details,
      }, { status: 500 })
    }

    return NextResponse.json({ 
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificate_number,
      },
      message: "Certificate created successfully"
    })
  } catch (error: any) {
    logError("Certificates API POST: Unexpected error", error, {
      component: "certificates/route",
      action: "POST",
    })
    return NextResponse.json({ 
      error: error?.message || "An unexpected error occurred while creating certificate",
    }, { status: 500 })
  }
}
