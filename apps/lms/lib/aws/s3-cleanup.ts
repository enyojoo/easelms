/**
 * S3 Cleanup Utilities
 * 
 * Functions to clean up S3 files when courses, lessons, or resources are deleted
 */

import { deleteFileFromS3, deleteVideoWithHLS } from "./s3"
import { createServiceRoleClient } from "@/lib/supabase/server"

/**
 * Extract S3 key from URL
 */
function extractS3KeyFromUrl(url: string): string | null {
  if (!url) return null
  
  // Check if it's an S3 or CloudFront URL
  if (url.includes("s3.amazonaws.com") || url.includes("cloudfront.net")) {
    try {
      const urlObj = new URL(url)
      // Remove leading slash if present
      return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
    } catch (e) {
      // Invalid URL, try to extract manually
      const match = url.match(/s3\.amazonaws\.com\/(.+)$|cloudfront\.net\/(.+)$/)
      if (match) {
        return match[1] || match[2] || null
      }
    }
  }
  
  return null
}

/**
 * Cleanup S3 files for a course
 * Deletes course thumbnail, preview video, and all lesson videos/resources
 */
export async function cleanupCourseFiles(courseId: number): Promise<{ deleted: number; errors: number }> {
  const supabase = createServiceRoleClient()
  let deleted = 0
  let errors = 0

  try {
    // Get course data
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("image, preview_video")
      .eq("id", courseId)
      .single()

    if (courseError) {
      console.error(`Error fetching course ${courseId} for cleanup:`, courseError)
      return { deleted: 0, errors: 1 }
    }

    // Delete course thumbnail
    if (course.image) {
      const thumbnailKey = extractS3KeyFromUrl(course.image)
      if (thumbnailKey) {
        try {
          await deleteFileFromS3(thumbnailKey)
          deleted++
          console.log(`Deleted course thumbnail: ${thumbnailKey}`)
        } catch (error: any) {
          console.error(`Error deleting course thumbnail ${thumbnailKey}:`, error)
          errors++
        }
      }
    }

    // Delete course preview video and its HLS folder
    if (course.preview_video) {
      const videoKey = extractS3KeyFromUrl(course.preview_video)
      if (videoKey) {
        try {
          const result = await deleteVideoWithHLS(videoKey)
          deleted += result.deleted
          console.log(`Deleted course preview video and HLS folder: ${videoKey} (${result.deleted} files)`)
          if (result.errors.length > 0) {
            errors += result.errors.length
            console.error(`Errors deleting HLS files for ${videoKey}:`, result.errors)
          }
        } catch (error: any) {
          console.error(`Error deleting course preview video ${videoKey}:`, error)
          errors++
        }
      }
    }

    // Get all lessons for this course
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, content")
      .eq("course_id", courseId)

    if (lessonsError) {
      console.error(`Error fetching lessons for course ${courseId}:`, lessonsError)
      return { deleted, errors: errors + 1 }
    }

    // Cleanup lesson files
    for (const lesson of lessons || []) {
      const lessonResult = await cleanupLessonFiles(lesson.id)
      deleted += lessonResult.deleted
      errors += lessonResult.errors
    }

    // Cleanup resource files
    const { data: resources, error: resourcesError } = await supabase
      .from("resources")
      .select("id, s3_key, url")
      .eq("created_by", course.created_by) // Only cleanup resources created by course creator
      .not("s3_key", "is", null)

    if (!resourcesError && resources) {
      // Get all lesson_resources for this course to find which resources are used
      const { data: lessonResources } = await supabase
        .from("lesson_resources")
        .select("resource_id")
        .in("lesson_id", (lessons || []).map(l => l.id))

      const usedResourceIds = new Set((lessonResources || []).map((lr: any) => lr.resource_id))

      // Only delete resources that are not used by any other course
      for (const resource of resources) {
        if (!usedResourceIds.has(resource.id)) {
          // Check if resource is used by any other lesson
          const { data: otherUsage } = await supabase
            .from("lesson_resources")
            .select("id")
            .eq("resource_id", resource.id)
            .limit(1)

          if (!otherUsage || otherUsage.length === 0) {
            // Resource is not used anywhere, safe to delete
            if (resource.s3_key) {
              try {
                await deleteFileFromS3(resource.s3_key)
                deleted++
                console.log(`Deleted unused resource file: ${resource.s3_key}`)
              } catch (error: any) {
                console.error(`Error deleting resource file ${resource.s3_key}:`, error)
                errors++
              }
            }
          }
        }
      }
    }

    console.log(`Course cleanup complete: ${deleted} files deleted, ${errors} errors`)
    return { deleted, errors }
  } catch (error: any) {
    console.error(`Error cleaning up course ${courseId}:`, error)
    return { deleted, errors: errors + 1 }
  }
}

/**
 * Cleanup S3 files for a lesson
 * Deletes lesson video and associated resource files
 */
export async function cleanupLessonFiles(lessonId: number): Promise<{ deleted: number; errors: number }> {
  const supabase = createServiceRoleClient()
  let deleted = 0
  let errors = 0

  try {
    // Get lesson data
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, content")
      .eq("id", lessonId)
      .single()

    if (lessonError || !lesson) {
      console.error(`Error fetching lesson ${lessonId} for cleanup:`, lessonError)
      return { deleted: 0, errors: 1 }
    }

    const content = lesson.content as any

    // Delete lesson video and its HLS folder if present
    if (content?.url) {
      const videoKey = extractS3KeyFromUrl(content.url)
      if (videoKey) {
        try {
          const result = await deleteVideoWithHLS(videoKey)
          deleted += result.deleted
          console.log(`Deleted lesson video and HLS folder: ${videoKey} (${result.deleted} files)`)
          if (result.errors.length > 0) {
            errors += result.errors.length
            console.error(`Errors deleting HLS files for ${videoKey}:`, result.errors)
          }
        } catch (error: any) {
          console.error(`Error deleting lesson video ${videoKey}:`, error)
          errors++
        }
      }
    }

    // Get resources for this lesson
    const { data: lessonResources } = await supabase
      .from("lesson_resources")
      .select("resource_id, resources(s3_key, usage_count)")
      .eq("lesson_id", lessonId)

    // Cleanup resource files (only if they're not used elsewhere)
    for (const lr of lessonResources || []) {
      const resource = (lr as any).resources
      if (resource && resource.s3_key) {
        // Check if resource is used by other lessons
        const { data: otherUsage } = await supabase
          .from("lesson_resources")
          .select("id")
          .eq("resource_id", (lr as any).resource_id)
          .neq("lesson_id", lessonId)
          .limit(1)

        if (!otherUsage || otherUsage.length === 0) {
          // Resource is not used by other lessons, safe to delete
          try {
            await deleteFileFromS3(resource.s3_key)
            deleted++
            console.log(`Deleted resource file: ${resource.s3_key}`)
          } catch (error: any) {
            console.error(`Error deleting resource file ${resource.s3_key}:`, error)
            errors++
          }
        }
      }
    }

    console.log(`Lesson cleanup complete: ${deleted} files deleted, ${errors} errors`)
    return { deleted, errors }
  } catch (error: any) {
    console.error(`Error cleaning up lesson ${lessonId}:`, error)
    return { deleted, errors: errors + 1 }
  }
}

/**
 * Cleanup S3 file for a single resource
 * Only deletes if resource is not used by any other lesson
 */
export async function cleanupResourceFile(resourceId: number): Promise<{ deleted: boolean; error?: string }> {
  const supabase = createServiceRoleClient()

  try {
    // Get resource data
    const { data: resource, error: resourceError } = await supabase
      .from("resources")
      .select("id, s3_key, usage_count")
      .eq("id", resourceId)
      .single()

    if (resourceError || !resource) {
      return { deleted: false, error: resourceError?.message || "Resource not found" }
    }

    // Check if resource is used by any lesson
    const { data: usage } = await supabase
      .from("lesson_resources")
      .select("id")
      .eq("resource_id", resourceId)
      .limit(1)

    if (usage && usage.length > 0) {
      return { deleted: false, error: "Resource is still in use by lessons" }
    }

    // Resource is not used, safe to delete
    if (resource.s3_key) {
      try {
        await deleteFileFromS3(resource.s3_key)
        console.log(`Deleted resource file: ${resource.s3_key}`)
        return { deleted: true }
      } catch (error: any) {
        console.error(`Error deleting resource file ${resource.s3_key}:`, error)
        return { deleted: false, error: error.message }
      }
    }

    return { deleted: false, error: "No S3 key found for resource" }
  } catch (error: any) {
    console.error(`Error cleaning up resource ${resourceId}:`, error)
    return { deleted: false, error: error.message }
  }
}
