import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface QuizResult {
  id: string
  user_id: string
  course_id: number
  lesson_id: number
  quiz_question_id: string
  user_answer: string | number
  is_correct: boolean
  score: number
  created_at: string
  updated_at: string
}

interface QuizResultsResponse {
  results: QuizResult[]
}

// Fetch quiz results for a course
export function useQuizResults(courseId: string | number | null) {
  return useQuery<QuizResultsResponse>({
    queryKey: ["quiz-results", courseId],
    queryFn: async () => {
      if (!courseId) throw new Error("Course ID is required")
      const response = await fetch(`/api/courses/${courseId}/quiz-results`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch quiz results")
      }
      return response.json()
    },
    enabled: !!courseId,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
  })
}

// Submit quiz results
export function useSubmitQuizResults() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      courseId: string | number
      lessonId: number
      answers: Array<{ questionId: string; userAnswer: number }>
    }) => {
      const response = await fetch(`/api/courses/${data.courseId}/quiz-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: data.lessonId,
          answers: data.answers,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to submit quiz results")
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate quiz results for the course
      queryClient.invalidateQueries({ queryKey: ["quiz-results", variables.courseId] })
      // Also invalidate progress since quiz completion affects progress
      queryClient.invalidateQueries({ queryKey: ["progress", variables.courseId] })
    },
  })
}

// Invalidate quiz results cache
export function useInvalidateQuizResults() {
  const queryClient = useQueryClient()
  return (courseId?: number) => {
    if (courseId) {
      queryClient.invalidateQueries({ queryKey: ["quiz-results", courseId] })
    } else {
      queryClient.invalidateQueries({ queryKey: ["quiz-results"] })
    }
  }
}

