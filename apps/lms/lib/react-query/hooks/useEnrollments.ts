import { useEnhancedQuery, useEnhancedMutation, cacheUtils } from "@/lib/cache/react-query-integration"

export interface Enrollment {
  id: string
  user_id: string
  course_id: number
  enrolled_at: string
  status: string
  progress?: number
  last_accessed_at?: string
  course?: any
}

interface EnrollmentsResponse {
  enrollments: Enrollment[]
}

// Fetch user enrollments with enhanced caching
export function useEnrollments() {
  return useEnhancedQuery<EnrollmentsResponse>(
    ["enrollments"],
    async () => {
      const response = await fetch("/api/enrollments")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch enrollments")
      }
      return response.json()
    },
    {
      cache: {
        ttl: 10 * 60 * 1000, // 10 minutes for enrollments
        version: '1.0',
        compress: true,
        priority: 'high' // Critical user data
      },
      enablePersistence: true
    }
  )
}

// Enroll in a course with optimistic updates
export function useEnrollCourse() {
  return useEnhancedMutation(
    async ({ courseId, bypassPrerequisites = false }: { courseId: number; bypassPrerequisites?: boolean }) => {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, bypassPrerequisites }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // Create error with full data for prerequisites handling
        const error: any = new Error(errorData.error || "Failed to enroll in course")
        error.response = response
        error.errorData = errorData
        throw error
      }
      return response.json()
    },
    {
      mutationKey: ["enrollments"],
      optimistic: true,
      rollbackOnError: true,
      onSuccess: (data, variables) => {
        // Invalidate related queries
        cacheUtils.clearCache(["courses"]) // Clear courses cache to reflect enrollment status
      }
    }
  )
}

// Invalidate enrollments cache
export function useInvalidateEnrollments() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["enrollments"] })
  }
}

