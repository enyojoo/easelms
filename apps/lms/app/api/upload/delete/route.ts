import { deleteFileFromS3, deleteVideoWithHLS, extractS3KeyFromUrl } from "@/lib/aws/s3"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { url, path } = await request.json()

  if (!url && !path) {
    return NextResponse.json({ error: "URL or path is required" }, { status: 400 })
  }

  try {
    // All files are stored in S3
    let s3Key = path
    
    if (!s3Key && url) {
      // Extract S3 key from URL
      // Format: https://bucket.s3.region.amazonaws.com/key
      // Format: https://cloudfront-domain.cloudfront.net/key
      // Format: https://endpoint.azurefd.net/key (Azure Front Door)
      try {
        const urlObj = new URL(url)
        
        if (url.includes("s3.amazonaws.com")) {
          const urlParts = url.split(".s3.")
          if (urlParts.length > 1) {
            s3Key = urlParts[1].split("/").slice(1).join("/").split("?")[0] // Remove query params
          }
        } else if (url.includes("cloudfront.net")) {
          // CloudFront URL: extract everything after domain
          s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
          s3Key = s3Key.split("?")[0] // Remove query params
        } else if (url.includes("azurefd.net")) {
          // Azure Front Door URL: pathname is the S3 key
          s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
          s3Key = s3Key.split("?")[0] // Remove query params
        } else if (url.includes("amazonaws.com")) {
          // Try to extract from any AWS URL format
          const match = url.match(/amazonaws\.com\/(.+)$/)
          if (match) {
            s3Key = match[1].split("?")[0] // Remove query params
          }
        } else {
          // Fallback: try to extract from pathname for any URL
          s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
          s3Key = s3Key.split("?")[0] // Remove query params
        }
      } catch (e) {
        logError("Failed to parse URL", e as Error, { url })
        // Try simple extraction as fallback
        const match = url.match(/\/([^?]+)/)
        if (match) {
          s3Key = match[1]
        }
      }
    }

    if (!s3Key) {
      return NextResponse.json({ error: "Could not extract S3 key from URL" }, { status: 400 })
    }

    try {
      // Check if it's a video file - if so, delete video + HLS folder
      const isVideoFile = s3Key.includes('/video-') || 
                         s3Key.includes('/preview-video-') || 
                         s3Key.includes('.mp4') || 
                         s3Key.includes('.webm') ||
                         s3Key.includes('.mov') ||
                         s3Key.includes('.avi')

      if (isVideoFile) {
        // Delete video file and its HLS folder
        const result = await deleteVideoWithHLS(s3Key)
        if (result.errors.length > 0) {
          logWarning("Some files failed to delete", { s3Key, errors: result.errors })
        }
        return NextResponse.json({ 
          message: `Deleted video and ${result.deleted} file(s) (including HLS folder)`,
          deleted: result.deleted,
          errors: result.errors.length > 0 ? result.errors : undefined
        })
      } else {
        // For non-video files, just delete the file
        await deleteFileFromS3(s3Key)
        return NextResponse.json({ message: "File deleted successfully from S3" })
      }
    } catch (s3Error: any) {
      // If file doesn't exist, that's okay
      if (s3Error.message?.includes("NoSuchKey") || s3Error.message?.includes("not found")) {
        return NextResponse.json({ message: "File deleted or not found in S3" })
      }
      throw s3Error
    }
  } catch (error: any) {
    logError("Delete error", error, {
      component: "upload/delete/route",
      action: "POST",
      userId: user.id,
    })
    return NextResponse.json(
      { error: error.message || "Failed to delete file" },
      { status: 500 }
    )
  }
}

