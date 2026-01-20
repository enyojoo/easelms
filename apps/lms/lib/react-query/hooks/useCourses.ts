import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppQuery, useAppMutation } from "./useAppCache"

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

// Fetch all courses
export function useCourses(options?: { recommended?: boolean; all?: boolean }) {
  return useAppQuery<CoursesResponse>(
    'courses',
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
    }
  )
}

// Fetch single course
export function useCourse(id: string | number | null) {
  return useAppQuery<{ course: Course }>(
    'course',
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
    { enabled: !!id }
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

