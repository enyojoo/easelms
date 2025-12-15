import { createClient } from "@/lib/supabase/server"
import { uploadFile } from "@/lib/supabase/storage"
import { getStoragePath, getBucketForType, isValidFileType, getMaxFileSize } from "@/lib/supabase/storage-helpers"
import type { StorageBucket } from "@/lib/supabase/storage"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File
  const fileType = (formData.get("type") as string) || "document" // thumbnail, document, avatar, certificate
  const bucketName = (formData.get("bucket") as string) || undefined
  const additionalPath = (formData.get("additionalPath") as string) || undefined

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  try {
    // Determine bucket
    const bucket: StorageBucket = bucketName
      ? (bucketName as StorageBucket)
      : getBucketForType(fileType as "thumbnail" | "document" | "avatar" | "certificate")

    // Validate file type
    if (!isValidFileType(file, bucket)) {
      return NextResponse.json(
        { error: `Invalid file type for ${bucket} bucket` },
        { status: 400 }
      )
    }

    // Validate file size
    const maxSize = getMaxFileSize(bucket)
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Generate storage path
    const path = getStoragePath(
      fileType as "thumbnail" | "document" | "avatar" | "certificate",
      user.id,
      file.name,
      additionalPath
    )

    // Upload file
    const result = await uploadFile(bucket, path, file, {
      contentType: file.type,
      upsert: false,
    })

    if (result.error) {
      throw new Error(result.error)
    }

    return NextResponse.json({
      url: result.url,
      path: result.path,
      bucket,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
}

