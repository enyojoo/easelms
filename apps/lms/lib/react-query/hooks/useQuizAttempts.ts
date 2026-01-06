import { useQuery } from "@tanstack/react-query"

interface QuizAttempt {
  id: number
  user_id: string
  lesson_id: number
  course_id: number
  attempt_number: number
  question_order: number[]
  answer_orders: { [questionId: string]: number[] }
  created_at: string
  completed_at: string | null
}

interface QuizAttemptResponse {
  attempt: QuizAttempt | null
  attemptNumber: number
}

// Fetch current quiz attempt for a lesson
export function useQuizAttempt(courseId: string | number | null, lessonId: number | null) {
  return useQuery<QuizAttemptResponse>({
    queryKey: ["quiz-attempt", courseId, lessonId],
    queryFn: async () => {
      if (!courseId || !lessonId) throw new Error("Course ID and Lesson ID are required")
      const response = await fetch(`/api/courses/${courseId}/quiz-attempts?lessonId=${lessonId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch quiz attempt")
      }
      return response.json()
    },
    enabled: !!courseId && !!lessonId,
    staleTime: 1 * 60 * 1000, // 1 minute - attempt number doesn't change frequently
    placeholderData: (previousData) => previousData,
  })
}
