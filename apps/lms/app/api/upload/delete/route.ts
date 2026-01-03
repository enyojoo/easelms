import { deleteFileFromS3 } from "@/lib/aws/s3"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
      if (url.includes("s3.amazonaws.com")) {
        const urlParts = url.split(".s3.")
        if (urlParts.length > 1) {
          s3Key = urlParts[1].split("/").slice(1).join("/")
        }
      } else if (url.includes("cloudfront.net")) {
        // CloudFront URL: extract everything after domain
        const urlObj = new URL(url)
        s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
      } else if (url.includes("amazonaws.com")) {
        // Try to extract from any AWS URL format
        const match = url.match(/amazonaws\.com\/(.+)$/)
        if (match) {
          s3Key = match[1].split("?")[0] // Remove query params
        }
      }
    }

    if (!s3Key) {
      return NextResponse.json({ error: "Could not extract S3 key from URL" }, { status: 400 })
    }

    try {
      await deleteFileFromS3(s3Key)
      return NextResponse.json({ message: "File deleted successfully from S3" })
    } catch (s3Error: any) {
      // If file doesn't exist, that's okay
      if (s3Error.message?.includes("NoSuchKey") || s3Error.message?.includes("not found")) {
        return NextResponse.json({ message: "File deleted or not found in S3" })
      }
      throw s3Error
    }
  } catch (error: any) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete file" },
      { status: 500 }
    )
  }
}

