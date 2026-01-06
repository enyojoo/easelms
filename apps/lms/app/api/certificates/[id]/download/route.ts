import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateCertificatePDF } from "@/lib/certificates/generate-pdf"
import { uploadFileToS3, getS3StoragePath, getPublicUrl } from "@/lib/aws/s3"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: certificate, error } = await supabase
    .from("certificates")
    .select(`
      *,
      courses (
        id,
        title,
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
    .eq("id", params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
  }

  // Check if user owns this certificate or is admin
  if (certificate.user_id !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  try {
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
        logInfo("Failed to fetch existing PDF, regenerating", { error: error instanceof Error ? error.message : String(error), certificateId: params.id })
      }
    }

    // PDF doesn't exist or failed to download, generate new one
    // Use flat columns directly (database doesn't have settings JSONB column)
    const course = certificate.courses

    // Use black logo URL for certificates (white background) - same as Logo component
    const logoUrl = "https://llxnjumccpvjlrdjqbcw.supabase.co/storage/v1/object/public/logo/EUNI%20Logo%20Bk.svg"
    
    // Organization name (hardcoded, same as used in Logo component)
    const organizationName = "Enthronement University"

    // Generate PDF certificate
    pdfBuffer = await generateCertificatePDF({
      certificateNumber: certificate.certificate_number,
      learnerName: certificate.profiles?.name || "Student",
      courseTitle: course?.title || "Course",
      issuedAt: certificate.issued_at,
      certificateType: course?.certificate_type || "completion", // certificate_type is in courses table, not certificates table
      certificateTitle: course?.certificate_title || undefined,
      certificateDescription: course?.certificate_description || undefined,
      certificateTemplate: course?.certificate_template || undefined,
      organizationName,
      logoUrl,
      signatureImage: course?.signature_image || undefined,
      signatureName: course?.signature_name || undefined,
      signatureTitle: course?.signature_title || undefined,
      additionalText: course?.additional_text || undefined,
    })

    // Upload PDF to S3
    const filename = `certificate-${certificate.certificate_number}.pdf`
    const courseId = certificate.course_id
    const s3Key = getS3StoragePath("certificate", certificate.user_id, filename, undefined, undefined, courseId)
    
    console.log("[Certificates API] Uploading PDF to S3:", {
      certificateId: params.id,
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

      // Save PDF URL to database
      const { error: updateError } = await supabase
        .from("certificates")
        .update({ certificate_url: url })
        .eq("id", params.id)

      if (updateError) {
        console.error("[Certificates API] Error updating certificate_url in database:", updateError)
        logError("Error updating certificate_url in database", updateError, {
          component: "certificates/[id]/download/route",
          action: "GET",
          certificateId: params.id,
          url,
        })
      } else {
        console.log("[Certificates API] certificate_url updated in database:", url)
      }
    } catch (uploadError) {
      console.error("[Certificates API] Error uploading certificate PDF to S3:", uploadError)
      logError("Error uploading certificate PDF to S3", uploadError, {
        component: "certificates/[id]/download/route",
        action: "GET",
        certificateId: params.id,
        userId: certificate.user_id,
        courseId,
        s3Key,
        error: uploadError instanceof Error ? uploadError.message : String(uploadError),
      })
      // Continue to return PDF even if upload fails
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
    logError("Error generating certificate PDF", error, {
      component: "certificates/[id]/download/route",
      action: "GET",
      certificateId: params.id,
    })
    return NextResponse.json(
      { error: "Failed to generate certificate PDF", details: error.message },
      { status: 500 }
    )
  }
}

