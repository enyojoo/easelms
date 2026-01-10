import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateCertificatePDF } from "@/lib/certificates/generate-pdf"
import { uploadFileToS3, getS3StoragePath, getPublicUrl } from "@/lib/aws/s3"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"
import { getBrandSettings } from "@/lib/supabase/brand-settings"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Extract id early to ensure it's in scope for error handling
  let certificateId: string = "unknown"
  try {
    // Await params since it's a Promise in Next.js 16
    const { id } = await params
    certificateId = id
    
    console.log("[Certificates API] Download request for certificate:", id)
    
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

    // Use service role client to bypass RLS and avoid infinite recursion
    const serviceSupabase = createServiceRoleClient()
    
    // Convert ID to number if it's a string (database stores IDs as integers)
    const certificateIdNum = typeof id === 'string' ? parseInt(id, 10) : id
    
    if (isNaN(certificateIdNum)) {
      console.error("[Certificates API] Invalid certificate ID format:", id)
      return NextResponse.json({ error: "Invalid certificate ID format" }, { status: 400 })
    }
    
    const { data: certificate, error } = await serviceSupabase
    .from("certificates")
    .select(`
      *,
      courses (
        id,
        title,
          certificate_enabled,
        certificate_template,
        certificate_title,
        certificate_description,
        signature_image,
        signature_name,
        signature_title,
        additional_text,
        certificate_type
      ),
      profiles (
        id,
        name
      )
    `)
      .eq("id", certificateIdNum)
    .maybeSingle()

  if (error) {
      console.error("[Certificates API] Error fetching certificate:", error)
      logError("Error fetching certificate", error, {
        component: "certificates/[id]/download/route",
        action: "GET",
        certificateId: certificateId,
        certificateIdNum,
      })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  if (!certificate) {
    console.error("[Certificates API] Certificate not found for id:", certificateIdNum)
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
  }


    console.log("[Certificates API] Certificate found:", {
      id: certificate.id,
      courseId: certificate.course_id,
      certificateNumber: certificate.certificate_number,
      userId: certificate.user_id,
      hasCourse: !!certificate.courses,
      hasProfile: !!certificate.profiles,
    })

    // Validate required certificate data
    if (!certificate.certificate_number) {
      console.error("[Certificates API] Certificate missing certificate_number:", certificate.id)
      return NextResponse.json(
        { error: "Certificate data is incomplete", details: "Missing certificate_number" },
        { status: 500 }
      )
    }

    if (!certificate.course_id) {
      console.error("[Certificates API] Certificate missing course_id:", certificate.id)
      return NextResponse.json(
        { error: "Certificate data is incomplete", details: "Missing course_id" },
        { status: 500 }
      )
    }

  // Check if user owns this certificate or is admin
  if (certificate.user_id !== user.id) {
      // Use service role client to bypass RLS for admin check
      const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

    // Check if PDF URL already exists (from previous generation)
    let pdfBuffer: Buffer
    let pdfUrl: string | null = certificate.certificate_url || null

    // If PDF URL exists and is an S3 URL, try to fetch it
    // Otherwise, regenerate (since we're migrating from Supabase Storage)
    if (pdfUrl && (pdfUrl.includes("s3.amazonaws.com") || pdfUrl.includes("cloudfront.net") || pdfUrl.includes("amazonaws.com"))) {
      try {
        const response = await fetch(pdfUrl, { method: "HEAD" })
        if (response.ok) {
          // PDF exists in S3, download and return it
          const pdfResponse = await fetch(pdfUrl)
          if (pdfResponse.ok) {
            const arrayBuffer = await pdfResponse.arrayBuffer()
            pdfBuffer = Buffer.from(arrayBuffer)
            
            return new NextResponse(pdfBuffer, {
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="certificate-${certificate.certificate_number}.pdf"`,
                "Content-Length": pdfBuffer.length.toString(),
              },
            })
          }
        }
      } catch (error) {
        // If fetch fails, regenerate PDF
        logInfo("Failed to fetch existing PDF, regenerating", { error: error instanceof Error ? error.message : String(error), certificateId: certificateId })
      }
    }

    // PDF doesn't exist or failed to download, generate new one
    // Use flat columns directly (database doesn't have settings JSONB column)
    let course = certificate.courses

    // If course relation didn't load, fetch it separately
    if (!course && certificate.course_id) {
      console.log("[Certificates API] Course relation not loaded, fetching separately for courseId:", certificate.course_id)
      const { data: courseData, error: courseError } = await serviceSupabase
        .from("courses")
        .select("id, title, certificate_enabled, certificate_template, certificate_title, certificate_description, signature_image, signature_name, signature_title, additional_text, certificate_type")
        .eq("id", certificate.course_id)
        .single()
      
      if (courseError) {
        console.error("[Certificates API] Error fetching course:", courseError)
        logError("Error fetching course for certificate", courseError, {
          component: "certificates/[id]/download/route",
          action: "GET",
          certificateId: certificateId,
          courseId: certificate.course_id,
        })
        return NextResponse.json(
          { error: "Failed to fetch course data", details: courseError.message },
          { status: 500 }
        )
      }
      course = courseData
    }

    if (!course) {
      console.error("[Certificates API] Course data not found for certificate:", certificateId, "courseId:", certificate.course_id)
      return NextResponse.json(
        { error: "Course data not found for this certificate" },
        { status: 500 }
      )
    }

    // Verify certificate is enabled for this course (using flat column directly)
    if (!course.certificate_enabled) {
      console.error("[Certificates API] Certificate is not enabled for this course:", course.id)
      return NextResponse.json(
        { error: "Certificate is not enabled for this course" },
        { status: 400 }
      )
    }

    // Fetch brand settings to use platform logo and name
    let logoUrl: string | undefined
    let organizationName: string | undefined
    
    try {
      const brandSettings = await getBrandSettings()
      // Use black logo for certificates (white background)
      // Check for valid non-empty URL
      logoUrl = (brandSettings.logoBlack && brandSettings.logoBlack.trim() !== "") 
        ? brandSettings.logoBlack 
        : undefined
      organizationName = (brandSettings.platformName && brandSettings.platformName.trim() !== "")
        ? brandSettings.platformName
        : undefined
      
      console.log("[Certificates API] Brand settings loaded:", {
        logoUrl,
        organizationName,
        logoBlack: brandSettings.logoBlack,
      })
    } catch (brandError) {
      // If brand settings fetch fails, log warning but continue with defaults
      logWarning("Failed to fetch brand settings for certificate", {
        component: "certificates/[id]/download/route",
        action: "GET",
        certificateId: certificateId,
        error: brandError instanceof Error ? brandError.message : String(brandError),
      })
      // Fallback to defaults if brand settings fetch fails
      logoUrl = "https://cldup.com/VQGhFU5kd6.svg"
      organizationName = "EaseLMS"
    }

    console.log("[Certificates API] Generating PDF with data:", {
      certificateNumber: certificate.certificate_number,
      learnerName: certificate.profiles?.name || "Student",
      courseTitle: course.title,
      certificateType: course.certificate_type,
      logoUrl: logoUrl || "NOT PROVIDED",
      organizationName: organizationName || "NOT PROVIDED",
      hasLogoUrl: !!logoUrl,
      logoUrlLength: logoUrl?.length || 0,
    })

    // Generate PDF certificate
    try {
    pdfBuffer = await generateCertificatePDF({
      certificateNumber: certificate.certificate_number,
      learnerName: certificate.profiles?.name || "Student",
        courseTitle: course.title || "Course",
      issuedAt: certificate.issued_at,
        certificateType: (course.certificate_type as "completion" | "participation" | "achievement") || "completion",
        certificateTitle: course.certificate_title || undefined,
        certificateDescription: course.certificate_description || undefined,
        certificateTemplate: course.certificate_template || undefined,
      organizationName,
      logoUrl,
        signatureImage: course.signature_image || undefined,
        signatureName: course.signature_name || undefined,
        signatureTitle: course.signature_title || undefined,
        additionalText: course.additional_text || undefined,
      })
      console.log("[Certificates API] PDF generated successfully, size:", pdfBuffer.length)
    } catch (pdfError: any) {
      console.error("[Certificates API] Error generating PDF:", pdfError)
      logError("Error generating certificate PDF", pdfError, {
        component: "certificates/[id]/download/route",
        action: "generatePDF",
        certificateId: certificateId,
        errorMessage: pdfError?.message,
        errorStack: pdfError?.stack,
      })
      throw pdfError // Re-throw to be caught by outer catch
    }

    // Upload PDF to S3
    const filename = `certificate-${certificate.certificate_number}.pdf`
    const courseId = certificate.course_id
    const s3Key = getS3StoragePath("certificate", certificate.user_id, filename, undefined, undefined, courseId)
    
    console.log("[Certificates API] Uploading PDF to S3:", {
      certificateId: certificateId,
      courseId,
      s3Key,
      filename,
      bufferSize: pdfBuffer.length,
    })
    
    try {
      const { key, url } = await uploadFileToS3(
        pdfBuffer,
        s3Key,
        "application/pdf"
      )

      console.log("[Certificates API] PDF uploaded successfully:", { key, url })

      // Save PDF URL to database (use service role client to bypass RLS)
      const { error: updateError } = await serviceSupabase
        .from("certificates")
        .update({ certificate_url: url })
        .eq("id", certificateId)

      if (updateError) {
        console.error("[Certificates API] Error updating certificate_url in database:", updateError)
        logError("Error updating certificate_url in database", updateError, {
          component: "certificates/[id]/download/route",
          action: "GET",
          certificateId: certificateId,
          url,
        })
        // Don't fail the request, but log the error
      } else {
        console.log("[Certificates API] certificate_url updated in database:", url)
      }
    } catch (uploadError) {
      console.error("[Certificates API] Error uploading certificate PDF to S3:", uploadError)
      logError("Error uploading certificate PDF to S3", uploadError, {
        component: "certificates/[id]/download/route",
        action: "GET",
        certificateId: certificateId,
        userId: certificate.user_id,
        courseId,
        s3Key,
        error: uploadError instanceof Error ? uploadError.message : String(uploadError),
        stack: uploadError instanceof Error ? uploadError.stack : undefined,
      })
      // Continue to return PDF even if upload fails - user can still download
      // But log the error so we know S3 upload is failing
    }

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${certificate.certificate_number}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error("[Certificates API] Error in download route:", {
      error: error,
      message: error?.message,
      stack: error?.stack,
      certificateId: certificateId,
    })
    logError("Error in certificate download route", error, {
      component: "certificates/[id]/download/route",
      action: "GET",
      certificateId: certificateId,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name,
    })
    return NextResponse.json(
      { 
        error: "Failed to process certificate download", 
        details: error?.message || "Unknown error",
        // Include more details in development
        ...(process.env.NODE_ENV === "development" && { stack: error?.stack })
      },
      { status: 500 }
    )
  }
}

