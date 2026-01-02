import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import type { StorageBucket } from "@/lib/supabase/storage"
import { deleteFileFromS3 } from "@/lib/aws/s3"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { url, bucket, path } = await request.json()

  if (!url && !path) {
    return NextResponse.json({ error: "URL or path is required" }, { status: 400 })
  }

  try {
    // Check if this is an S3 URL
    const isS3Url = url && (
      url.includes("s3.amazonaws.com") ||
      url.includes("amazonaws.com") ||
      url.includes("cloudfront.net") ||
      bucket === "s3"
    )

    if (isS3Url) {
      // Handle S3 deletion
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
    }

    // Handle Supabase Storage deletion (backward compatibility)
    if (!bucket) {
      return NextResponse.json({ error: "Bucket is required for Supabase storage" }, { status: 400 })
    }

    // Use service role client to bypass RLS for storage operations
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      console.warn("Service role key not available, using regular client:", serviceError.message)
      serviceClient = null
    }

    // Extract path from URL if path not provided
    let filePath = path
    if (!filePath && url) {
      // Extract path from public URL
      // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlParts = url.split(`/${bucket}/`)
      if (urlParts.length > 1) {
        filePath = urlParts[1]
      } else {
        // Try to extract from other URL formats
        const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
        if (match) {
          filePath = match[1]
        }
      }
    }

    if (!filePath) {
      return NextResponse.json({ error: "Could not extract file path from URL" }, { status: 400 })
    }

    // Delete file using service client to bypass RLS
    const deleteClient = serviceClient || supabase
    const { error: deleteError } = await deleteClient.storage
      .from(bucket as StorageBucket)
      .remove([filePath])

    if (deleteError) {
      // If file doesn't exist, that's okay - it might have been deleted already
      if (deleteError.message?.includes("not found") || deleteError.message?.includes("does not exist")) {
        return NextResponse.json({ message: "File deleted or not found" })
      }
      throw deleteError
    }

    return NextResponse.json({ message: "File deleted successfully" })
  } catch (error: any) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete file" },
      { status: 500 }
    )
  }
}

