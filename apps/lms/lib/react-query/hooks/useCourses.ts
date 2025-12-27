import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

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
  return useQuery<CoursesResponse>({
    queryKey: ["courses", options],
    queryFn: async () => {
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
    staleTime: 10 * 60 * 1000, // 10 minutes - courses don't change often
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
  })
}

// Fetch single course
export function useCourse(id: string | number | null) {
  return useQuery<{ course: Course }>({
    queryKey: ["course", id],
    queryFn: async () => {
      if (!id) throw new Error("Course ID is required")
      const response = await fetch(`/api/courses/${id}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch course")
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes - course details don't change often
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
  })
}

// Invalidate courses cache
export function useInvalidateCourses() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["courses"] })
    queryClient.invalidateQueries({ queryKey: ["course"] })
  }
}

