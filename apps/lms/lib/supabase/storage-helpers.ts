/**
 * Helper functions for Supabase Storage path generation and bucket selection
 */

import type { StorageBucket } from "./storage"

/**
 * Get the appropriate bucket for a file type
 */
export function getBucketForType(type: "thumbnail" | "document" | "avatar" | "certificate"): StorageBucket {
  const bucketMap: Record<string, StorageBucket> = {
    thumbnail: "course-thumbnails",
    document: "course-documents",
    avatar: "course-documents", // Using course-documents until user-avatars bucket is created
    certificate: "certificates",
  }

  return bucketMap[type] || "course-documents"
}

/**
 * Generate a storage path for a file
 */
export function getStoragePath(
  type: "thumbnail" | "document" | "avatar" | "certificate",
  userId: string,
  filename: string,
  additionalPath?: string
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
  const path = additionalPath ? `${additionalPath}/` : ""

  switch (type) {
    case "thumbnail":
      return `thumbnails/${userId}/${timestamp}-${sanitizedFilename}`
    case "document":
      return `documents/${userId}/${path}${timestamp}-${sanitizedFilename}`
    case "avatar":
      // Store avatars in avatars folder within course-documents bucket (until user-avatars bucket exists)
      return `avatars/${userId}/${timestamp}-${sanitizedFilename}`
    case "certificate":
      return `certificates/${userId}/${timestamp}-${sanitizedFilename}`
    default:
      return `uploads/${userId}/${timestamp}-${sanitizedFilename}`
  }
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
}

/**
 * Validate file type for a given bucket
 */
export function isValidFileType(file: File, bucket: StorageBucket): boolean {
  const fileExtension = getFileExtension(file.name).toLowerCase()

  switch (bucket) {
    case "course-thumbnails":
    case "user-avatars":
      return ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension)
    case "course-documents":
      // Allow both images (for avatars) and documents in course-documents bucket
      return ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "txt", "zip"].includes(fileExtension)
    case "certificates":
      return ["pdf", "png", "jpg", "jpeg"].includes(fileExtension)
    default:
      return true
  }
}

/**
 * Get maximum file size for a bucket (in bytes)
 */
export function getMaxFileSize(bucket: StorageBucket): number {
  switch (bucket) {
    case "course-thumbnails":
    case "user-avatars":
      return 5 * 1024 * 1024 // 5MB
    case "course-documents":
      return 50 * 1024 * 1024 // 50MB
    case "certificates":
      return 10 * 1024 * 1024 // 10MB
    default:
      return 10 * 1024 * 1024 // 10MB default
  }
}

