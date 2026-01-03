import { createClient } from "@/lib/supabase/server"
import { getS3StoragePath, getPresignedPutUrl, getPublicUrl } from "@/lib/aws/s3"
import { NextResponse } from "next/server"

/**
 * Generate a presigned URL for direct S3 upload (bypasses Next.js body size limits)
 * Used for large files like videos
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { filename, fileType, contentType, additionalPath } = await request.json()

    if (!filename || !fileType || !contentType) {
      return NextResponse.json(
        { error: "filename, fileType, and contentType are required" },
        { status: 400 }
      )
    }

    // Validate file type
    if (fileType !== "video" && fileType !== "document" && fileType !== "thumbnail" && fileType !== "avatar" && fileType !== "certificate") {
      return NextResponse.json(
        { error: "Invalid file type. Must be video, document, thumbnail, avatar, or certificate" },
        { status: 400 }
      )
    }

    // Generate S3 storage path
    const s3Key = getS3StoragePath(
      fileType as "video" | "thumbnail" | "document" | "avatar" | "certificate",
      user.id,
      filename,
      additionalPath
    )

    // Generate presigned PUT URL (expires in 1 hour)
    const presignedUrl = await getPresignedPutUrl(s3Key, contentType, 3600)

    // Return presigned URL and the final public URL
    const publicUrl = getPublicUrl(s3Key)

    return NextResponse.json({
      presignedUrl,
      key: s3Key,
      url: publicUrl,
    })
  } catch (error: any) {
    console.error("Presigned URL generation error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate presigned URL" },
      { status: 500 }
    )
  }
}
