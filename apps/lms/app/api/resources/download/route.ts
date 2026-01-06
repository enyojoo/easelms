import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!

/**
 * Extract S3 key from URL
 */
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    
    // Check if it's a CloudFront URL
    if (urlObj.hostname.includes("cloudfront.net")) {
      // Extract pathname and remove leading slash
      return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
    }
    
    // Check if it's an S3 URL (bucket.s3.region.amazonaws.com or s3.amazonaws.com/bucket)
    if (urlObj.hostname.includes("s3") || urlObj.hostname.includes("amazonaws.com")) {
      // Format: https://bucket.s3.region.amazonaws.com/key
      // Format: https://s3.region.amazonaws.com/bucket/key
      if (urlObj.hostname.startsWith(BUCKET_NAME)) {
        // Format: bucket.s3.region.amazonaws.com
        return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
      } else if (urlObj.hostname.includes("s3") && urlObj.pathname.startsWith(`/${BUCKET_NAME}/`)) {
        // Format: s3.region.amazonaws.com/bucket/key
        return urlObj.pathname.slice(`/${BUCKET_NAME}/`.length)
      }
      
      // Try to extract from pathname if it contains the bucket
      const pathParts = urlObj.pathname.split("/").filter(Boolean)
      const bucketIndex = pathParts.indexOf(BUCKET_NAME)
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join("/")
      }
      
      // Last resort: use pathname without leading slash
      return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
    }
    
    return null
  } catch (error) {
    logError("Error parsing URL", error instanceof Error ? error : new Error(String(error)), {
      component: "resources/download/route",
      action: "GET",
    })
    return null
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fileUrl = searchParams.get("url")

  if (!fileUrl) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    // Extract S3 key from URL
    const s3Key = extractS3KeyFromUrl(fileUrl)
    
    if (!s3Key) {
      return NextResponse.json({ error: "Invalid S3 URL" }, { status: 400 })
    }

    // Download file from S3
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Determine content type
    const contentType = response.ContentType || "application/octet-stream"
    
    // Extract filename from key
    const keyParts = s3Key.split("/")
    const filename = keyParts[keyParts.length - 1] || "download"

    // Return file with proper headers
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error: any) {
    logError("Error downloading file from S3", error, {
      component: "resources/download/route",
      action: "GET",
      fileUrl,
    })
    
    // Handle specific S3 errors
    if (error.name === "NoSuchKey" || error.Code === "NoSuchKey") {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    
    if (error.name === "AccessDenied" || error.Code === "AccessDenied") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to download file" },
      { status: 500 }
    )
  }
}
