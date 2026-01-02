import { createClient } from "@/lib/supabase/server"
import { uploadFileToS3, getS3StoragePath, getPublicUrl, isValidVideoFile, isValidImageFile, isValidDocumentFile, getMaxVideoSize, getMaxImageSize, getMaxDocumentSize } from "@/lib/aws/s3"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File
  const fileType = (formData.get("type") as string) || "document" // video, thumbnail, document, avatar, certificate
  const additionalPath = (formData.get("additionalPath") as string) || undefined

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  try {
    // Determine file type and validate
    let s3Type: "video" | "thumbnail" | "document" | "avatar" | "certificate"
    let maxSize: number
    let isValid: boolean

    // Auto-detect file type if not explicitly set
    if (fileType === "video" || file.type.startsWith("video/")) {
      s3Type = "video"
      maxSize = getMaxVideoSize()
      isValid = isValidVideoFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid video file type. Supported formats: MP4, WebM, OGG" },
          { status: 400 }
        )
      }
    } else if (fileType === "thumbnail" || fileType === "avatar" || file.type.startsWith("image/")) {
      s3Type = fileType === "avatar" ? "avatar" : "thumbnail"
      maxSize = getMaxImageSize()
      isValid = isValidImageFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid image file type. Supported formats: JPG, PNG, GIF, WebP" },
          { status: 400 }
        )
      }
    } else if (fileType === "certificate") {
      s3Type = "certificate"
      maxSize = getMaxDocumentSize()
      isValid = isValidDocumentFile(file) || isValidImageFile(file) // Certificates can be PDF or image
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid certificate file type. Supported formats: PDF, PNG, JPG, JPEG" },
          { status: 400 }
        )
      }
    } else {
      // Default to document
      s3Type = "document"
      maxSize = getMaxDocumentSize()
      isValid = isValidDocumentFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid document file type. Supported formats: PDF, DOC, DOCX, TXT, ZIP" },
          { status: 400 }
        )
      }
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / 1024 / 1024
      const maxSizeGB = maxSize / 1024 / 1024 / 1024
      const sizeLabel = maxSizeGB >= 1 ? `${maxSizeGB}GB` : `${maxSizeMB}MB`
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${sizeLabel}` },
        { status: 400 }
      )
    }

    // Generate S3 storage path
    const s3Path = getS3StoragePath(
      s3Type,
      user.id,
      file.name,
      additionalPath
    )

    // Upload to S3
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const { key, url } = await uploadFileToS3(fileBuffer, s3Path, file.type)

    return NextResponse.json({
      url,
      path: key,
      bucket: "s3",
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
}

