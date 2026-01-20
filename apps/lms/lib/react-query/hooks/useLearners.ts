import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppQuery } from "./useAppCache"

export interface Learner {
  id: string
  name: string
  email: string
  profile_image?: string
  user_type: string
  created_at: string
  enrolled_courses_count?: number
}

interface LearnersResponse {
  learners: Learner[]
}

// Fetch learners (admin only)
export function useLearners(options?: { search?: string; enrollmentFilter?: string }) {
  return useAppQuery<LearnersResponse>(
    'adminLearners',
    ["learners", options],
    async () => {
      const params = new URLSearchParams()
      if (options?.search) params.append("search", options.search)
      if (options?.enrollmentFilter) params.append("enrollmentFilter", options.enrollmentFilter)

      const response = await fetch(`/api/learners?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch learners")
      }
      return response.json()
    }
  )
}

// Fetch single learner details
export function useLearner(learnerId: string | null) {
  return useAppQuery<{ learner: Learner }>(
    'adminLearners',
    ["learner", learnerId],
    async () => {
      if (!learnerId) throw new Error("Learner ID is required")
      const response = await fetch(`/api/learners/${learnerId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch learner")
      }
      return response.json()
    },
    { enabled: !!learnerId }
  )
}

// Invalidate learners cache
export function useInvalidateLearners() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["learners"] })
    queryClient.invalidateQueries({ queryKey: ["learner"] })
  }
}

