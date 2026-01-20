import { useEnhancedQuery, cacheUtils } from "@/lib/cache/react-query-integration"

export interface Course {
  id: number
  title: string
  description?: string
  price?: number
  image?: string
  thumbnail?: string
  lessons?: Array<any>
  settings?: any
  [key: string]: any
}

interface CoursesResponse {
  courses: Course[]
}

// Fetch all courses with enhanced caching
export function useCourses(options?: { recommended?: boolean; all?: boolean }) {
  return useEnhancedQuery<CoursesResponse>(
    ["courses", options],
    async () => {
      const params = new URLSearchParams()
      if (options?.recommended) params.append("recommended", "true")
      if (options?.all) params.append("all", "true")

      const response = await fetch(`/api/courses?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch courses")
      }
      return response.json()
    },
    {
      cache: {
        ttl: 10 * 60 * 1000, // 10 minutes for courses
        version: '1.0',
        compress: true,
        priority: 'medium' // Medium priority - courses change occasionally
      },
      enablePersistence: true
    }
  )
}

// Fetch single course with enhanced caching
export function useCourse(id: string | number | null) {
  return useEnhancedQuery<{ course: Course }>(
    ["course", id],
    async () => {
      if (!id) throw new Error("Course ID is required")
      const response = await fetch(`/api/courses/${id}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch course")
      }
      return response.json()
    },
    {
      enabled: !!id,
      cache: {
        ttl: 15 * 60 * 1000, // 15 minutes for course details
        version: '1.0',
        compress: true,
        priority: 'medium'
      },
      enablePersistence: true
    }
  )
}

// Invalidate courses cache
export function useInvalidateCourses() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["courses"] })
    queryClient.invalidateQueries({ queryKey: ["course"] })
  }
}

