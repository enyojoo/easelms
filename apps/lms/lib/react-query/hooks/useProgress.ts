import { useQueryClient } from "@tanstack/react-query"
import { useAppQuery, useAppMutation } from "./useAppCache"

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
  return useAppQuery<ProgressResponse>(
    'progress',
    ["progress", courseId ?? "all"],
    async () => {
      const url = courseId ? `/api/progress?courseId=${courseId}` : `/api/progress`
      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch progress")
      }
      return response.json()
    }
  )
}

// Save progress with optimistic updates
export function useSaveProgress() {
  return useAppMutation(
    async (progressData: {
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
    {
      invalidateQueries: [["progress", (variables: any) => variables.course_id]],
      optimisticUpdate: {
        queryKey: ["progress", (variables: any) => variables.course_id],
        updater: (oldData: ProgressResponse | undefined, variables: any) => {
          if (!oldData) return oldData

          // Find existing progress entry or create new one
          const existingIndex = oldData.progress.findIndex(
            (p) => p.course_id === variables.course_id && p.lesson_id === variables.lesson_id
          )

          const updatedProgress = { ...variables, user_id: "current-user" }

          if (existingIndex >= 0) {
            // Update existing progress
            const newProgress = [...oldData.progress]
            newProgress[existingIndex] = { ...newProgress[existingIndex], ...updatedProgress }
            return { ...oldData, progress: newProgress }
          } else {
            // Add new progress entry
            return {
              ...oldData,
              progress: [...oldData.progress, updatedProgress]
            }
          }
        }
      }
    }
  )
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

