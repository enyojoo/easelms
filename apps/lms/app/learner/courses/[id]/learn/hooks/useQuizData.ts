import { useMemo } from "react"

interface UseQuizDataProps {
  quizResultsData?: {
    results?: any[]
  }
  progressData?: {
    progress?: any[]
  }
  course?: {
    lessons?: Array<{
      id: number
      quiz_questions?: any[]
    }>
  }
}

/**
 * Custom hook to process quiz results and progress data
 * Extracted from learn/page.tsx to simplify the main component
 */
export function useQuizData({ quizResultsData, progressData, course }: UseQuizDataProps) {
  return useMemo(() => {
    const completedQuizzesMap: { [lessonId: number]: boolean } = {}
    const answersMap: { [lessonId: number]: number[] } = {}
    const scoresMap: { [lessonId: number]: number } = {}

    // Defensive check: ensure data structures are fully initialized
    if (!quizResultsData || !progressData) {
      return { completedQuizzes: completedQuizzesMap, quizScores: scoresMap, quizAnswers: answersMap }
    }

    // Ensure results and progress are arrays (defensive check for transitional states)
    if (!Array.isArray(quizResultsData.results) || !Array.isArray(progressData.progress)) {
      return { completedQuizzes: completedQuizzesMap, quizScores: scoresMap, quizAnswers: answersMap }
    }

    // Process quiz results (answers)
    const resultsByLesson: { [lessonId: number]: any[] } = {}
    quizResultsData.results.forEach((result: any) => {
      // Defensive check: ensure result has lesson_id
      if (result && typeof result.lesson_id !== 'undefined' && result.lesson_id !== null) {
        const lessonId = result.lesson_id
        if (!resultsByLesson[lessonId]) {
          resultsByLesson[lessonId] = []
        }
        resultsByLesson[lessonId].push(result)
      }
    })

    Object.entries(resultsByLesson).forEach(([lessonId, results]: [string, any]) => {
      const lessonIdNum = parseInt(lessonId)
      if (!isNaN(lessonIdNum)) {
        completedQuizzesMap[lessonIdNum] = true
        // Defensive check: ensure results is an array
        if (Array.isArray(results)) {
          // Get current lesson's questions to match by ID
          const currentLesson = course?.lessons?.find((l: any) => l.id === lessonIdNum)
          const questions = currentLesson?.quiz_questions || []
          
          if (questions.length > 0) {
            // Check if results have shuffle data (denormalized for instant display)
            const firstResult = results[0]
            const hasShuffle = firstResult?.shuffled_question_order && Array.isArray(firstResult.shuffled_question_order) && firstResult.shuffled_question_order.length > 0
            const shuffledQuestionOrder = hasShuffle ? firstResult.shuffled_question_order : null
            const shuffledAnswerOrders = hasShuffle ? (firstResult.shuffled_answer_orders || {}) : {}
            
            if (hasShuffle && shuffledQuestionOrder) {
              // Questions are shuffled - map answers to shuffled question order
              // NOTE: Answers themselves are NOT shuffled, only question order is shuffled
              const answersArray: (number | null)[] = new Array(shuffledQuestionOrder.length).fill(null)
              
              // Create a map of question ID to result for quick lookup
              const resultMap = new Map<string, any>()
              results.forEach((r: any) => {
                const questionId = r.quiz_question_id?.toString()
                if (questionId) {
                  resultMap.set(questionId, r)
                }
              })
              
              // Map results to shuffled question positions
              // Answers stay in original order (not shuffled)
              shuffledQuestionOrder.forEach((originalQuestionId: number, shuffledIndex: number) => {
                const questionIdStr = String(originalQuestionId)
                const result = resultMap.get(questionIdStr)
                
                if (result) {
                  // Answer index is in original order (answers are NOT shuffled)
                  const originalAnswer = result.user_answer
                  const numericAnswer = typeof originalAnswer === 'string' ? parseInt(originalAnswer) : originalAnswer
                  if (numericAnswer !== null && !isNaN(numericAnswer)) {
                    answersArray[shuffledIndex] = numericAnswer
                  }
                }
              })
              
              answersMap[lessonIdNum] = answersArray.filter((a: any) => a !== null && !isNaN(a)) as number[]
            } else {
              // Not shuffled - use original matching logic
              const answersArray: (number | null)[] = new Array(questions.length).fill(null)
              
              results.forEach((r: any) => {
                // Try to find matching question by ID
                const questionIndex = questions.findIndex((q: any) => {
                  const questionId = q.id?.toString()
                  const resultQuestionId = r.quiz_question_id?.toString()
                  // Match by exact ID (handles both string and number IDs)
                  return questionId && resultQuestionId && 
                         (questionId === resultQuestionId || 
                          questionId === String(resultQuestionId) ||
                          String(questionId) === resultQuestionId)
                })
                
                if (questionIndex >= 0 && questionIndex < answersArray.length) {
                  const answer = r?.user_answer
                  // Convert answer to number if it's a string
                  const numericAnswer = typeof answer === 'string' ? parseInt(answer) : answer
                  if (numericAnswer !== null && !isNaN(numericAnswer)) {
                    answersArray[questionIndex] = numericAnswer
                  }
                }
              })
              
              answersMap[lessonIdNum] = answersArray.filter((a: any) => a !== null && !isNaN(a)) as number[]
            }
            
            // Calculate score for this lesson
            const lessonProgress = progressData.progress.find((p: any) => p.lesson_id === lessonIdNum)
            if (lessonProgress && lessonProgress.quiz_score !== null && lessonProgress.quiz_score !== undefined) {
              scoresMap[lessonIdNum] = lessonProgress.quiz_score
            }
          }
        }
      }
    })

    // Extract quiz attempt counts from progress data
    const attemptCountsMap: { [lessonId: number]: number } = {}
    if (progressData?.progress && Array.isArray(progressData.progress)) {
      progressData.progress.forEach((p: any) => {
        if (p.lesson_id && p.quiz_attempts !== null && p.quiz_attempts !== undefined) {
          attemptCountsMap[p.lesson_id] = p.quiz_attempts
        }
      })
    }

    // Extract shuffle data for each lesson (for proper review display)
    const shuffleDataMap: { [lessonId: number]: { questionOrder?: number[], answerOrders?: { [questionId: string]: number[] } } } = {}
    Object.entries(resultsByLesson).forEach(([lessonId, results]: [string, any]) => {
      const lessonIdNum = parseInt(lessonId)
      if (!isNaN(lessonIdNum) && Array.isArray(results) && results.length > 0) {
        const firstResult = results[0]
        if (firstResult?.shuffled_question_order && Array.isArray(firstResult.shuffled_question_order)) {
          shuffleDataMap[lessonIdNum] = {
            questionOrder: firstResult.shuffled_question_order,
            answerOrders: firstResult.shuffled_answer_orders || {},
          }
        }
      }
    })

    return {
      completedQuizzes: completedQuizzesMap,
      quizScores: scoresMap,
      quizAnswers: answersMap,
      quizAttemptCounts: attemptCountsMap,
      shuffleData: shuffleDataMap,
    }
  }, [quizResultsData, progressData, course])
}
