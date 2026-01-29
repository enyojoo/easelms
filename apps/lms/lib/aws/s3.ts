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
 * Structure: 
 * - courses/course-{id}/thumbnail-{id}-{filename}
 * - courses/course-{id}/preview-video-{id}-{filename}
 * - courses/course-{id}/lessons/lesson-{id}/lesson-{id}-{filename}
 * - courses/course-{id}/lessons/lesson-{id}/resources/resource-{id}-{filename}
 * - courses/course-{id}/certificate/template-{id}-{filename}
 * - courses/course-{id}/certificate/signature-{id}-{filename}
 * - courses/course-{id}/lessons/lesson-{id}/quiz/quiz-{id}-{filename}
 * - profile/user-{id}/avatar-{id}-{filename}
 */
export function getS3StoragePath(
  type: "video" | "thumbnail" | "document" | "avatar" | "certificate" | "quiz-image" | "certificate-template" | "signature" | "lesson" | "quiz" | "resource",
  userId: string,
  filename: string,
  additionalPath?: string,
  fileHash?: string, // Optional hash for deduplication
  courseId?: string | number,
  lessonId?: string | number,
  resourceId?: string | number,
  fileId?: string | number // Optional file ID for better identification
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
  
  // Use hash in filename if provided (for deduplication)
  const hashPrefix = fileHash ? `${fileHash.substring(0, 8)}-` : ""
  
  // Generate file identifier: use fileId if provided, otherwise use timestamp
  const fileIdentifier = fileId ? `${fileId}` : timestamp
  
  switch (type) {
    case "video":
      // Videos: courses/course-{id}/preview-video-{id}-{filename} or courses/course-{id}/lessons/lesson-{id}/video-{id}-{filename}
      if (courseId) {
        if (lessonId) {
          // Lesson video
          return `courses/course-${courseId}/lessons/lesson-${lessonId}/video-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
        } else {
          // Preview video
          return `courses/course-${courseId}/preview-video-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
        }
      }
      // Fallback: use additionalPath for backward compatibility
      if (additionalPath) {
        if (additionalPath.includes("/lessons/") || additionalPath.includes("lesson-")) {
          const parts = additionalPath.split("/")
          const lessonPart = parts.find(p => p.startsWith("lesson-")) || parts[parts.length - 1]
          const coursePart = parts.find(p => p.startsWith("course-")) || parts[0]
          const courseIdFromPath = coursePart.replace("course-", "")
          const lessonIdFromPath = lessonPart.replace("lesson-", "")
          return `courses/course-${courseIdFromPath}/lessons/lesson-${lessonIdFromPath}/video-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
        }
        // Preview video
        return `courses/course-${additionalPath}/preview-video-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      }
      return `courses/temp-${userId}/videos/video-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "thumbnail":
      // Thumbnails: courses/course-{id}/thumbnail-{id}-{filename}
      if (courseId) {
        return `courses/course-${courseId}/thumbnail-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      }
      // Fallback: use additionalPath for backward compatibility
      if (additionalPath) {
        return `courses/course-${additionalPath}/thumbnail-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      }
      return `courses/temp-${userId}/thumbnail-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "document":
      // Documents: courses/course-{id}/lessons/lesson-{id}/resources/resource-{id}-{filename} or courses/course-{id}/resources/resource-{id}-{filename}
      if (courseId) {
        if (lessonId) {
          // Lesson resource
          const resourcePrefix = resourceId ? `resource-${resourceId}` : `resource-${fileIdentifier}`
          return `courses/course-${courseId}/lessons/lesson-${lessonId}/resources/${resourcePrefix}-${hashPrefix}${sanitizedFilename}`
        } else {
          // Course-level resource
          const resourcePrefix = resourceId ? `resource-${resourceId}` : `resource-${fileIdentifier}`
          return `courses/course-${courseId}/resources/${resourcePrefix}-${hashPrefix}${sanitizedFilename}`
        }
      }
      // Fallback: use additionalPath for backward compatibility
      if (additionalPath) {
        if (additionalPath.includes("/lessons/") || additionalPath.includes("lesson-")) {
          const parts = additionalPath.split("/")
          const lessonPart = parts.find(p => p.startsWith("lesson-")) || parts[parts.length - 1]
          const coursePart = parts.find(p => p.startsWith("course-")) || parts[0]
          const courseIdFromPath = coursePart.replace("course-", "")
          const lessonIdFromPath = lessonPart.replace("lesson-", "")
          const resourcePrefix = resourceId ? `resource-${resourceId}` : `resource-${fileIdentifier}`
          return `courses/course-${courseIdFromPath}/lessons/lesson-${lessonIdFromPath}/resources/${resourcePrefix}-${hashPrefix}${sanitizedFilename}`
        }
        const resourcePrefix = resourceId ? `resource-${resourceId}` : `resource-${fileIdentifier}`
        return `courses/course-${additionalPath}/resources/${resourcePrefix}-${hashPrefix}${sanitizedFilename}`
      }
      return `courses/temp-${userId}/resources/resource-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "quiz-image":
      // Legacy support: Quiz images: courses/course-{id}/quiz-images/quiz-{id}-{filename}
      if (courseId) {
        const quizPrefix = fileId ? `quiz-${fileId}` : `quiz-${fileIdentifier}`
        return `courses/course-${courseId}/quiz-images/${quizPrefix}-${hashPrefix}${sanitizedFilename}`
      }
      return `courses/temp-${userId}/quiz-images/quiz-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "quiz":
      // Quiz images: courses/course-{id}/lessons/lesson-{id}/quiz/quiz-{id}-{filename}
      if (courseId && lessonId) {
        const quizPrefix = fileId ? `quiz-${fileId}` : `quiz-${fileIdentifier}`
        return `courses/course-${courseId}/lessons/lesson-${lessonId}/quiz/${quizPrefix}-${hashPrefix}${sanitizedFilename}`
      }
      // Fallback if no lessonId
      if (courseId) {
        const quizPrefix = fileId ? `quiz-${fileId}` : `quiz-${fileIdentifier}`
        return `courses/course-${courseId}/quiz-images/${quizPrefix}-${hashPrefix}${sanitizedFilename}`
      }
      return `courses/temp-${userId}/quiz-images/quiz-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "resource":
      // Resources: courses/course-{id}/lessons/lesson-{id}/resources/resource-{id}-{filename}
      if (courseId) {
        if (lessonId) {
          // Lesson resource
          const resourcePrefix = resourceId ? `resource-${resourceId}` : `resource-${fileIdentifier}`
          return `courses/course-${courseId}/lessons/lesson-${lessonId}/resources/${resourcePrefix}-${hashPrefix}${sanitizedFilename}`
        } else {
          // Course-level resource
          const resourcePrefix = resourceId ? `resource-${resourceId}` : `resource-${fileIdentifier}`
          return `courses/course-${courseId}/resources/${resourcePrefix}-${hashPrefix}${sanitizedFilename}`
        }
      }
      return `courses/temp-${userId}/resources/resource-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "lesson":
      // Lesson videos: courses/course-{id}/lessons/lesson-{id}/lesson-{id}-{filename}
      if (courseId && lessonId) {
        return `courses/course-${courseId}/lessons/lesson-${lessonId}/lesson-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      }
      // Fallback
      if (courseId) {
        return `courses/course-${courseId}/lessons/lesson-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      }
      return `courses/temp-${userId}/lessons/lesson-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "certificate-template":
      // Certificate templates: courses/course-{id}/certificate/template-{id}-{filename}
      if (courseId) {
        return `courses/course-${courseId}/certificate/template-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      }
      return `courses/temp-${userId}/certificate/template-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "signature":
      // Signature images: courses/course-{id}/certificate/signature-{id}-{filename}
      if (courseId) {
        return `courses/course-${courseId}/certificate/signature-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      }
      return `courses/temp-${userId}/certificate/signature-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "avatar":
      // Profile avatars: profile/user-{id}/avatar-{id}-{filename}
      return `profile/user-${userId}/avatar-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    case "certificate":
      // Legacy support: Certificates: courses/course-{id}/certificate/certificate-{id}-{filename}
      if (courseId) {
        const certPrefix = fileId ? `certificate-${fileId}` : `certificate-${fileIdentifier}`
        return `courses/course-${courseId}/certificate/${certPrefix}-${hashPrefix}${sanitizedFilename}`
      }
      // Fallback for user certificates
      return `profile/user-${userId}/certificate-${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
      
    default:
      return `uploads/temp-${userId}/${fileIdentifier}-${hashPrefix}${sanitizedFilename}`
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
 * Extract S3 key from a full URL (handles both S3 URLs and CDN URLs)
 */
export function extractS3KeyFromUrl(url: string): string | null {
  if (!url) return null
  
  try {
    const urlObj = new URL(url)
    
    // Handle S3 URLs: https://bucket.s3.region.amazonaws.com/key
    if (urlObj.hostname.includes('.s3.') && urlObj.hostname.includes('.amazonaws.com')) {
      return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
    }
    
    // Handle Azure Front Door URLs: https://endpoint.azurefd.net/key
    // The pathname should be the S3 key
    if (urlObj.hostname.includes('.azurefd.net')) {
      return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
    }
    
    // Handle other CDN URLs - try to extract key from pathname
    if (urlObj.pathname) {
      return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
    }
    
    return null
  } catch (error) {
    // Invalid URL, return null
    return null
  }
}

/**
 * Transform S3 URL to Azure Front Door URL (with fallback to S3)
 */
export function transformToCDNUrl(s3Url: string): string {
  if (!s3Url) return s3Url
  
  const useCDN = process.env.USE_AZURE_CDN === 'true'
  const azureCDNUrl = process.env.AZURE_CDN_URL
  
  // If CDN is disabled or URL not configured, return original URL
  if (!useCDN || !azureCDNUrl) {
    return s3Url
  }
  
  // Extract S3 key from URL
  const s3Key = extractS3KeyFromUrl(s3Url)
  if (!s3Key) {
    // Can't extract key, return original URL
    return s3Url
  }
  
  // Encode the key properly for CDN URL
  const encodedKey = s3Key.split("/").map(segment => {
    if (segment.includes(" ") || /[^a-zA-Z0-9._-]/.test(segment)) {
      return encodeURIComponent(segment)
    }
    return segment
  }).join("/")
  
  // Return Azure Front Door URL
  return `${azureCDNUrl}/${encodedKey}`
}

/**
 * Recursively transform video URLs in data objects
 * Handles video_url, preview_video, and content.url fields
 */
export function transformVideoUrls(data: any): any {
  if (!data) return data
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => transformVideoUrls(item))
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const transformed: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      // Transform video URL fields
      if ((key === 'video_url' || key === 'preview_video' || key === 'url') && typeof value === 'string' && value.trim()) {
        // Check if it's a video URL
        const isVideo = value.includes('/video-') ||
                       value.includes('/preview-video-') ||
                       value.includes('.mp4') ||
                       value.includes('.webm') ||
                       value.includes('.m3u8') ||
                       value.includes('.ts')
        
        if (isVideo) {
          transformed[key] = transformToCDNUrl(value)
        } else {
          transformed[key] = value
        }
      } else if (key === 'content' && typeof value === 'object' && value !== null) {
        // Recursively transform content object
        transformed[key] = transformVideoUrls(value)
      } else if (key === 'lessons' && Array.isArray(value)) {
        // Transform lessons array
        transformed[key] = transformVideoUrls(value)
      } else {
        // Recursively transform nested objects/arrays
        transformed[key] = transformVideoUrls(value)
      }
    }
    
    return transformed
  }
  
  // Return primitive values as-is
  return data
}

/**
 * Get public URL for a file (uses Azure Front Door if enabled, otherwise S3)
 */
export function getPublicUrl(key: string, useCDN: boolean = false): string {
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
  
  // Check if Azure Front Door should be used
  const azureCDNUrl = process.env.AZURE_CDN_URL
  const useCDNEnv = process.env.USE_AZURE_CDN === 'true'
  
  if ((useCDN || useCDNEnv) && azureCDNUrl) {
    // Check if this is a video file
    const isVideo = cleanKey.includes('/video-') ||
                   cleanKey.includes('/preview-video-') ||
                   cleanKey.includes('.mp4') ||
                   cleanKey.includes('.webm') ||
                   cleanKey.includes('.m3u8') ||
                   cleanKey.includes('.ts')
    
    if (isVideo || useCDN) {
      return `${azureCDNUrl}/${cleanKey}`
    }
  }
  
  // Fallback to S3 URL
  const region = process.env.AWS_REGION || "us-east-1"
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${cleanKey}`
}

/**
 * Get HLS manifest URL for a video (generates .m3u8 URL from original video key)
 */
export function getHLSVideoUrl(originalVideoKey: string): string {
  // Extract base path and filename
  const lastSlashIndex = originalVideoKey.lastIndexOf('/')
  const path = lastSlashIndex >= 0 ? originalVideoKey.substring(0, lastSlashIndex) : ''
  const filename = lastSlashIndex >= 0 ? originalVideoKey.substring(lastSlashIndex + 1) : originalVideoKey
  
  // Remove extension and add /hls/master.m3u8
  const baseName = filename.replace(/\.[^/.]+$/, '')
  const hlsKey = path ? `${path}/hls/${baseName}/master.m3u8` : `hls/${baseName}/master.m3u8`
  
  // Use CDN if enabled
  return getPublicUrl(hlsKey, true)
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
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
  const validExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
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

