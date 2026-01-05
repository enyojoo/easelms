import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import type { PutObjectCommandInput } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!

/**
 * Generate S3 storage path for a file
 * Improved structure: courses/{courseId}/preview/ or courses/{courseId}/lessons/{lessonId}/video/
 * Uses hash-based naming for better organization and deduplication
 */
export function getS3StoragePath(
  type: "video" | "thumbnail" | "document" | "avatar" | "certificate",
  userId: string,
  filename: string,
  additionalPath?: string,
  fileHash?: string // Optional hash for deduplication
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
  const extension = filename.split(".").pop()?.toLowerCase() || ""
  
  // Use hash in filename if provided (for deduplication)
  const hashPrefix = fileHash ? `${fileHash.substring(0, 8)}-` : ""
  
  switch (type) {
    case "video":
      // Videos: courses/{courseId}/preview/video-{hash}-{filename} or courses/{courseId}/lessons/{lessonId}/video-{hash}-{filename}
      if (additionalPath) {
        // Check if additionalPath contains lesson ID (format: courseId/lessons/lessonId)
        if (additionalPath.includes("/lessons/")) {
          const [courseId, , lessonId] = additionalPath.split("/")
          return `courses/${courseId}/lessons/${lessonId}/video/${hashPrefix}${timestamp}-${sanitizedFilename}`
        }
        // Preview video
        return `courses/${additionalPath}/preview/video-${hashPrefix}${timestamp}-${sanitizedFilename}`
      }
      return `courses/${userId}/videos/${hashPrefix}${timestamp}-${sanitizedFilename}`
    case "thumbnail":
      // Thumbnails: courses/{courseId}/preview/thumbnail-{hash}-{filename}
      if (additionalPath) {
        return `courses/${additionalPath}/preview/thumbnail-${hashPrefix}${timestamp}-${sanitizedFilename}`
      }
      return `courses/${userId}/preview/thumbnail-${hashPrefix}${timestamp}-${sanitizedFilename}`
    case "document":
      // Documents: courses/{courseId}/lessons/{lessonId}/resources/{hash}-{filename} or courses/{courseId}/resources/{hash}-{filename}
      if (additionalPath) {
        if (additionalPath.includes("/lessons/")) {
          const [courseId, , lessonId] = additionalPath.split("/")
          return `courses/${courseId}/lessons/${lessonId}/resources/${hashPrefix}${timestamp}-${sanitizedFilename}`
        }
        return `courses/${additionalPath}/resources/${hashPrefix}${timestamp}-${sanitizedFilename}`
      }
      return `courses/${userId}/resources/${hashPrefix}${timestamp}-${sanitizedFilename}`
    case "avatar":
      return `users/${userId}/avatar/${hashPrefix}${timestamp}-${sanitizedFilename}`
    case "certificate":
      return `certificates/${userId}/${hashPrefix}${timestamp}-${sanitizedFilename}`
    default:
      return `uploads/${userId}/${hashPrefix}${timestamp}-${sanitizedFilename}`
  }
}

/**
 * Upload file to S3
 */
export async function uploadFileToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  })

  await s3Client.send(command)
  const url = getPublicUrl(key)
  
  return { key, url }
}

/**
 * Get presigned URL for private access (if needed) - GET
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Get presigned URL for uploading (PUT) - for direct client uploads
 */
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Get public URL for a file (uses CloudFront if configured, otherwise direct S3)
 */
export function getPublicUrl(key: string): string {
  // Remove leading slash if present
  let cleanKey = key.startsWith("/") ? key.slice(1) : key
  
  // S3 URLs can handle most characters, but we should encode spaces and special chars
  // Only encode if the key contains characters that need encoding
  if (cleanKey.includes(" ") || cleanKey.includes("%")) {
    // Encode each path segment separately to preserve slashes
    cleanKey = cleanKey.split("/").map(segment => {
      // Only encode if segment contains spaces or special characters
      if (segment.includes(" ") || /[^a-zA-Z0-9._-]/.test(segment)) {
        return encodeURIComponent(segment)
      }
      return segment
    }).join("/")
  }
  
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN
  // Check if CloudFront is actually configured (not a placeholder)
  const isCloudFrontConfigured = cloudfrontDomain && 
    cloudfrontDomain.trim() !== "" && 
    !cloudfrontDomain.includes("your_cloudfront_domain") &&
    !cloudfrontDomain.includes("your-cloudfront-domain") &&
    cloudfrontDomain.includes("cloudfront.net")
  
  if (isCloudFrontConfigured) {
    return `https://${cloudfrontDomain}/${cleanKey}`
  }
  
  // Use direct S3 URL
  const region = process.env.AWS_REGION || "us-east-1"
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${cleanKey}`
}

/**
 * Delete file from S3
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

/**
 * Validate video file type
 */
export function isValidVideoFile(file: File): boolean {
  const validTypes = ["video/mp4", "video/webm", "video/ogg"]
  const validExtensions = ["mp4", "webm", "ogg"]
  const extension = file.name.split(".").pop()?.toLowerCase()
  
  return validTypes.includes(file.type) || (extension ? validExtensions.includes(extension) : false)
}

/**
 * Validate image file type
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
  const validExtensions = ["jpg", "jpeg", "png", "gif", "webp"]
  const extension = file.name.split(".").pop()?.toLowerCase()
  
  return validTypes.includes(file.type) || (extension ? validExtensions.includes(extension) : false)
}

/**
 * Validate document file type
 */
export function isValidDocumentFile(file: File): boolean {
  const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "application/zip"]
  const validExtensions = ["pdf", "doc", "docx", "txt", "zip"]
  const extension = file.name.split(".").pop()?.toLowerCase()
  
  return validTypes.includes(file.type) || (extension ? validExtensions.includes(extension) : false)
}

/**
 * Get maximum file size for video uploads (2GB default)
 */
export function getMaxVideoSize(): number {
  return 2 * 1024 * 1024 * 1024 // 2GB
}

/**
 * Get maximum file size for images (5MB default)
 */
export function getMaxImageSize(): number {
  return 5 * 1024 * 1024 // 5MB
}

/**
 * Get maximum file size for documents (50MB default)
 */
export function getMaxDocumentSize(): number {
  return 50 * 1024 * 1024 // 50MB
}

