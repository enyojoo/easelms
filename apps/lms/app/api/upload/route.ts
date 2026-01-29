import { createClient } from "@/lib/supabase/server"
import { uploadFileToS3, getS3StoragePath, getPublicUrl, isValidVideoFile, isValidImageFile, isValidDocumentFile, getMaxVideoSize, getMaxImageSize, getMaxDocumentSize } from "@/lib/aws/s3"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File
  const fileType = (formData.get("type") as string) || "document" // video, thumbnail, document, avatar, certificate, quiz-image, certificate-template, signature, lesson, quiz, resource
  const additionalPath = (formData.get("additionalPath") as string) || undefined
  const courseId = (formData.get("courseId") as string) || undefined
  const lessonId = (formData.get("lessonId") as string) || undefined
  const resourceId = (formData.get("resourceId") as string) || undefined
  const fileId = (formData.get("fileId") as string) || undefined

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  try {
    // Determine file type and validate
    let s3Type: "video" | "thumbnail" | "document" | "avatar" | "certificate" | "quiz-image" | "certificate-template" | "signature" | "lesson" | "quiz" | "resource"
    let maxSize: number
    let isValid: boolean

    // Handle new specific types first
    if (fileType === "certificate-template") {
      s3Type = "certificate-template"
      maxSize = getMaxDocumentSize()
      isValid = isValidDocumentFile(file) || isValidImageFile(file) // Templates can be PDF or image
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid certificate template file type. Supported formats: PDF, PNG, JPG, JPEG, SVG" },
          { status: 400 }
        )
      }
    } else if (fileType === "signature") {
      s3Type = "signature"
      maxSize = getMaxImageSize()
      isValid = isValidImageFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid signature file type. Supported formats: JPG, PNG, GIF, WebP, SVG" },
          { status: 400 }
        )
      }
    } else if (fileType === "lesson") {
      s3Type = "lesson"
      maxSize = getMaxVideoSize()
      isValid = isValidVideoFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid lesson video file type. Supported formats: MP4, WebM, OGG" },
          { status: 400 }
        )
      }
    } else if (fileType === "quiz") {
      s3Type = "quiz"
      maxSize = getMaxImageSize()
      isValid = isValidImageFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid quiz image file type. Supported formats: JPG, PNG, GIF, WebP, SVG" },
          { status: 400 }
        )
      }
    } else if (fileType === "resource") {
      s3Type = "resource"
      maxSize = getMaxDocumentSize()
      isValid = isValidDocumentFile(file) || isValidImageFile(file) || isValidVideoFile(file) // Resources can be various types
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid resource file type. Supported formats: PDF, DOC, DOCX, TXT, ZIP, JPG, PNG, SVG, MP4, WebM" },
          { status: 400 }
        )
      }
    } else if (fileType === "video" || file.type.startsWith("video/")) {
      s3Type = "video"
      maxSize = getMaxVideoSize()
      isValid = isValidVideoFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid video file type. Supported formats: MP4, WebM, OGG" },
          { status: 400 }
        )
      }
    } else if (fileType === "quiz-image") {
      // Legacy support
      s3Type = "quiz-image"
      maxSize = getMaxImageSize()
      isValid = isValidImageFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid quiz image file type. Supported formats: JPG, PNG, GIF, WebP, SVG" },
          { status: 400 }
        )
      }
    } else if (fileType === "thumbnail" || fileType === "avatar" || file.type.startsWith("image/")) {
      s3Type = fileType === "avatar" ? "avatar" : "thumbnail"
      maxSize = getMaxImageSize()
      isValid = isValidImageFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid image file type. Supported formats: JPG, PNG, GIF, WebP, SVG" },
          { status: 400 }
        )
      }
    } else if (fileType === "certificate") {
      // Legacy support
      s3Type = "certificate"
      maxSize = getMaxDocumentSize()
      isValid = isValidDocumentFile(file) || isValidImageFile(file) // Certificates can be PDF or image
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid certificate file type. Supported formats: PDF, PNG, JPG, JPEG, SVG" },
          { status: 400 }
        )
      }
    } else {
      // Default to document (legacy) or resource
      s3Type = fileType === "document" ? "document" : "resource"
      maxSize = getMaxDocumentSize()
      isValid = isValidDocumentFile(file) || isValidImageFile(file) || isValidVideoFile(file)
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid file type. Supported formats: PDF, DOC, DOCX, TXT, ZIP, JPG, PNG, SVG, MP4, WebM" },
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

    // Generate S3 storage path with proper folder structure
    const s3Path = getS3StoragePath(
      s3Type,
      user.id,
      file.name,
      additionalPath,
      undefined, // fileHash - will be calculated if needed
      courseId,
      lessonId,
      resourceId,
      fileId
    )

    // Upload to S3
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const { key, url: s3Url } = await uploadFileToS3(fileBuffer, s3Path, file.type)

    // Transform to CDN URL if enabled (for videos)
    const isVideo = s3Type === "video" || s3Type === "lesson"
    const finalUrl = isVideo ? getPublicUrl(key, true) : s3Url

    return NextResponse.json({
      url: finalUrl,
      path: key,
      bucket: "s3",
    })
  } catch (error: any) {
    logError("Upload error", error, {
      component: "upload/route",
      action: "POST",
      userId: user.id,
      fileType,
    })
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
}

