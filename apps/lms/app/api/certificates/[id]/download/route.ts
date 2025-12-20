import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateCertificatePDF } from "@/lib/certificates/generate-pdf"
import { uploadFile } from "@/lib/supabase/storage"
import { getStoragePath } from "@/lib/supabase/storage-helpers"

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
        settings
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
    // Check if PDF already exists in storage
    let pdfBuffer: Buffer
    let pdfPath: string | null = certificate.pdf_url || null

    if (pdfPath) {
      // Try to download existing PDF from storage
      const { data: existingPdf, error: downloadError } = await supabase.storage
        .from("certificates")
        .download(pdfPath)

      if (!downloadError && existingPdf) {
        // PDF exists, return it
        const arrayBuffer = await existingPdf.arrayBuffer()
        pdfBuffer = Buffer.from(arrayBuffer)
        
        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="certificate-${certificate.certificate_number}.pdf"`,
            "Content-Length": pdfBuffer.length.toString(),
          },
        })
      }
      // If download failed, regenerate PDF
    }

    // PDF doesn't exist or failed to download, generate new one
    // Get platform settings for organization name
    const { data: platformSettings } = await supabase
      .from("platform_settings")
      .select("organization_name")
      .single()

    // Get course certificate settings
    const courseSettings = certificate.courses?.settings as any
    const certificateSettings = courseSettings?.certificate || {}

    // Generate PDF certificate
    pdfBuffer = await generateCertificatePDF({
      certificateNumber: certificate.certificate_number,
      learnerName: certificate.profiles?.name || "Student",
      courseTitle: certificate.courses?.title || "Course",
      issuedAt: certificate.issued_at,
      certificateType: certificate.certificate_type || certificateSettings.certificateType || "completion",
      organizationName: platformSettings?.organization_name || "Enthronement University",
      signatureImage: certificateSettings.signatureImage,
      signatureTitle: certificateSettings.signatureTitle,
      additionalText: certificateSettings.additionalText,
    })

    // Upload PDF to Supabase Storage
    const filename = `certificate-${certificate.certificate_number}.pdf`
    pdfPath = getStoragePath("certificate", certificate.user_id, filename)
    
    const uploadResult = await uploadFile(
      "certificates",
      pdfPath,
      pdfBuffer,
      {
        contentType: "application/pdf",
        upsert: true, // Overwrite if exists
      }
    )

    if (uploadResult.error) {
      console.error("Error uploading certificate PDF:", uploadResult.error)
      // Continue to return PDF even if upload fails
    } else {
      // Save PDF URL to database
      await supabase
        .from("certificates")
        .update({ pdf_url: uploadResult.path })
        .eq("id", params.id)
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
    console.error("Error generating certificate PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate certificate PDF", details: error.message },
      { status: 500 }
    )
  }
}

