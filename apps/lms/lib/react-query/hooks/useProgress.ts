import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface Progress {
  id?: string
  user_id: string
  course_id: number
  lesson_id: number
  completed: boolean
  completed_at?: string | null
  quiz_score?: number | null
  quiz_attempts?: number | null
  video_progress?: number | null
  progress_percentage?: number | null
}

interface ProgressResponse {
  progress: Progress[]
}

// Fetch progress for a course (or all progress if courseId is null/undefined)
export function useProgress(courseId: string | number | null | undefined) {
  return useQuery<ProgressResponse>({
    queryKey: ["progress", courseId ?? "all"],
    queryFn: async () => {
      const url = courseId ? `/api/progress?courseId=${courseId}` : `/api/progress`
      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch progress")
      }
      return response.json()
    },
    staleTime: 0, // Always consider data stale - fetch fresh data on mount
    refetchOnMount: true, // Always refetch on mount to ensure fresh data across devices
    refetchOnWindowFocus: true, // Refetch when window regains focus
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
  })
}

// Save progress
export function useSaveProgress() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (progressData: {
      course_id: number
      lesson_id: number
      completed: boolean
      completed_at?: string | null
      quiz_score?: number | null
      quiz_attempts?: number | null
    }) => {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progressData),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save progress")
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch progress for the specific course and all progress
      queryClient.invalidateQueries({ queryKey: ["progress", variables.course_id] })
      queryClient.invalidateQueries({ queryKey: ["progress", "all"] })
      // Refetch immediately to ensure UI updates
      queryClient.refetchQueries({ queryKey: ["progress", variables.course_id] })
      queryClient.refetchQueries({ queryKey: ["progress", "all"] })
    },
  })
}

// Invalidate progress cache
export function useInvalidateProgress() {
  const queryClient = useQueryClient()
  return (courseId?: number) => {
    if (courseId) {
      queryClient.invalidateQueries({ queryKey: ["progress", courseId] })
    } else {
      queryClient.invalidateQueries({ queryKey: ["progress"] })
    }
  }
}

