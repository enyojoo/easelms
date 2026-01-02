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
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - enrollments don't change frequently
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
  })
}

// Enroll in a course
export function useEnrollCourse() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (courseId: number) => {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to enroll in course")
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

