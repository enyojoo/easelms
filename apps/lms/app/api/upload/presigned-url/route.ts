import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { StorageBucket } from "@/lib/supabase/storage"

/**
 * Generate a presigned URL for Supabase Storage
 * Note: Supabase Storage doesn't use presigned URLs in the same way as S3,
 * but we can create signed URLs for private buckets
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { bucket, path, expiresIn } = await request.json()

  if (!bucket || !path) {
    return NextResponse.json({ error: "Bucket and path are required" }, { status: 400 })
  }

  try {
    // For public buckets, return the public URL directly
    // For private buckets, create a signed URL
    const { data, error } = await supabase.storage
      .from(bucket as StorageBucket)
      .createSignedUrl(path, expiresIn || 3600)

    if (error) {
      throw error
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate signed URL" },
      { status: 500 }
    )
  }
}

