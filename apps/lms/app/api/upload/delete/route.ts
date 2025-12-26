import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import type { StorageBucket } from "@/lib/supabase/storage"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Use service role client to bypass RLS for storage operations
  let serviceClient
  try {
    serviceClient = createServiceRoleClient()
  } catch (serviceError: any) {
    console.warn("Service role key not available, using regular client:", serviceError.message)
    serviceClient = null
  }

  const { url, bucket, path } = await request.json()

  if (!url && !path) {
    return NextResponse.json({ error: "URL or path is required" }, { status: 400 })
  }

  if (!bucket) {
    return NextResponse.json({ error: "Bucket is required" }, { status: 400 })
  }

  try {
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

