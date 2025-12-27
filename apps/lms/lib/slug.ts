/**
 * Generate a URL-friendly slug from a title
 * @param title The course title
 * @returns A URL-safe slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .slice(0, 50) // Limit length
}

/**
 * Extract course ID from a slug that may contain the ID
 * Format: "course-title-123" where 123 is the ID, or just "123"
 * @param slug The slug string
 * @returns The course ID as a string
 */
export function extractIdFromSlug(slug: string): string {
  // If the entire slug is just a number, return it as-is
  if (/^\d+$/.test(slug)) {
    return slug
  }
  
  // Otherwise, extract the last part after splitting by hyphens
  const parts = slug.split('-')
  const lastPart = parts[parts.length - 1]
  
  // Check if last part is a number (course ID)
  if (/^\d+$/.test(lastPart)) {
    return lastPart
  }
  
  // If no valid ID found, return the slug as-is (may be invalid)
  return slug
}

/**
 * Create a URL slug with the course ID appended
 * @param title The course title
 * @param id The course ID
 * @returns A slug in format "course-title-123"
 */
export function createCourseSlug(title: string, id: number | string): string {
  const baseSlug = generateSlug(title)
  return `${baseSlug}-${id}`
}

