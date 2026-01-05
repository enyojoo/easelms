/**
 * S3 File Deduplication Utilities
 * 
 * Functions to detect duplicate files and reuse existing S3 objects
 */

import { createServiceRoleClient } from "@/lib/supabase/server"
import crypto from "crypto"

/**
 * Calculate SHA-256 hash of file content
 */
export async function calculateFileHash(file: File | Buffer): Promise<string> {
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return crypto.createHash("sha256").update(buffer).digest("hex")
  } else {
    return crypto.createHash("sha256").update(file).digest("hex")
  }
}

/**
 * Check if file with same hash already exists
 * Returns existing resource if found, null otherwise
 */
export async function findExistingFileByHash(
  fileHash: string,
  userId: string
): Promise<{ id: number; url: string; s3_key: string } | null> {
  const supabase = createServiceRoleClient()

  const { data: existingResource, error } = await supabase
    .from("resources")
    .select("id, url, s3_key")
    .eq("file_hash", fileHash)
    .eq("created_by", userId) // Only reuse files from same user for privacy
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned (expected if file doesn't exist)
    console.error("Error checking for existing file:", error)
    return null
  }

  return existingResource || null
}

/**
 * Get or upload file with deduplication
 * Returns existing URL if file hash exists, otherwise uploads new file
 */
export async function getOrUploadFile(
  file: File,
  userId: string,
  type: "video" | "thumbnail" | "document" | "avatar" | "certificate",
  additionalPath?: string
): Promise<{ url: string; key: string; isNew: boolean; hash: string }> {
  // Calculate file hash
  const fileHash = await calculateFileHash(file)

  // Check if file with same hash already exists
  const existingFile = await findExistingFileByHash(fileHash, userId)

  if (existingFile) {
    console.log(`File deduplication: Reusing existing file with hash ${fileHash.substring(0, 8)}...`)
    return {
      url: existingFile.url,
      key: existingFile.s3_key || "",
      isNew: false,
      hash: fileHash,
    }
  }

  // File doesn't exist, need to upload
  // Import upload function dynamically to avoid circular dependencies
  const { uploadFileToS3, getS3StoragePath } = await import("./s3")
  
  const filename = file instanceof File ? file.name : "upload"
  const s3Key = getS3StoragePath(type, userId, filename, additionalPath)
  
  // Convert file to buffer for upload
  let fileBuffer: Buffer
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer()
    fileBuffer = Buffer.from(arrayBuffer)
  } else {
    fileBuffer = file
  }

  // Upload to S3
  const { url } = await uploadFileToS3(fileBuffer, s3Key, file instanceof File ? file.type : "application/octet-stream")

  console.log(`File uploaded: ${s3Key} (hash: ${fileHash.substring(0, 8)}...)`)

  return {
    url,
    key: s3Key,
    isNew: true,
    hash: fileHash,
  }
}

/**
 * Update resource with file hash after upload
 */
export async function updateResourceHash(
  resourceId: number,
  fileHash: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("resources")
    .update({ file_hash: fileHash })
    .eq("id", resourceId)

  if (error) {
    console.error(`Error updating resource hash for resource ${resourceId}:`, error)
    throw error
  }
}
