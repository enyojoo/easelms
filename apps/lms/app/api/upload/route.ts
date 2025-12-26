import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
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

  // Use service role client to bypass RLS for storage operations
  let serviceClient
  try {
    serviceClient = createServiceRoleClient()
  } catch (serviceError: any) {
    console.warn("Service role key not available, using regular client:", serviceError.message)
    serviceClient = null
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

    // Check if bucket exists, create if it doesn't (using service client)
    const clientToUse = serviceClient || supabase
    const { data: buckets, error: listError } = await clientToUse.storage.listBuckets()
    
    if (listError) {
      console.warn("Error listing buckets:", listError)
    } else {
      const bucketExists = buckets?.some((b) => b.name === bucket)
      if (!bucketExists) {
        // Try to create bucket (this might fail if user doesn't have permission, but we'll try)
        const { error: createError } = await clientToUse.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: getMaxFileSize(bucket),
        })
        if (createError) {
          console.warn(`Bucket ${bucket} does not exist and could not be created:`, createError.message)
          // Continue anyway - bucket might exist but not be listed due to permissions
        }
      }
    }

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

    // Upload file using service client to bypass RLS
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const uploadClient = serviceClient || supabase
    
    const { data: uploadData, error: uploadError } = await uploadClient.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      // If upload fails with RLS error, provide helpful message
      if (uploadError.message?.includes("row-level security") || uploadError.message?.includes("RLS")) {
        throw new Error(`Storage access denied. Please ensure the ${bucket} bucket exists and has proper permissions.`)
      }
      if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("does not exist")) {
        throw new Error(`Bucket "${bucket}" not found. Please create the bucket in Supabase Storage first.`)
      }
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = uploadClient.storage.from(bucket).getPublicUrl(uploadData.path)

    return NextResponse.json({
      url: publicUrl,
      path: uploadData.path,
      bucket,
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
}

