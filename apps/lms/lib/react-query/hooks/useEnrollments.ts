import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppQuery, useAppMutation } from "./useAppCache"

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
  return useAppQuery<EnrollmentsResponse>(
    'enrollments',
    ["enrollments"],
    async () => {
      const response = await fetch("/api/enrollments")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch enrollments")
      }
      return response.json()
    }
  )
}

// Enroll in a course with optimistic updates
export function useEnrollCourse() {
  return useAppMutation(
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
      invalidateQueries: [["enrollments"], ["courses"]],
      optimisticUpdate: {
        queryKey: ["enrollments"],
        updater: (oldData: EnrollmentsResponse | undefined, variables: { courseId: number }) => {
          if (!oldData) return oldData

          // Optimistically add the enrollment
          const newEnrollment = {
            id: `temp-${variables.courseId}`,
            user_id: "current-user", // Will be replaced by real data
            course_id: variables.courseId,
            enrolled_at: new Date().toISOString(),
            status: "active",
            progress: 0,
          }

          return {
            ...oldData,
            enrollments: [...oldData.enrollments, newEnrollment]
          }
        }
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

