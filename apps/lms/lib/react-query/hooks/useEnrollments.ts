import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

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

// Fetch user enrollments
export function useEnrollments() {
  return useQuery<EnrollmentsResponse>({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const response = await fetch("/api/enrollments")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch enrollments")
      }
      const data = await response.json()

      // Cache in localStorage for better persistence
      try {
        localStorage.setItem('easelms_enrollments', JSON.stringify(data))
      } catch (e) {
        // Ignore localStorage errors
      }

      return data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - match courses page, enrollments don't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: (previousData) => {
      // Try to get from localStorage if no previous data
      if (!previousData) {
        try {
          const cached = localStorage.getItem('easelms_enrollments')
          return cached ? JSON.parse(cached) : undefined
        } catch (e) {
          return undefined
        }
      }
      return previousData
    },
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent loading states
    // Remove refetchOnMount to use default behavior - don't force refetch on every visit
  })
}

// Enroll in a course
export function useEnrollCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ courseId, bypassPrerequisites = false }: { courseId: number; bypassPrerequisites?: boolean }) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] })
      queryClient.invalidateQueries({ queryKey: ["courses"] })
    },
  })
}

// Invalidate enrollments cache
export function useInvalidateEnrollments() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["enrollments"] })
  }
}

