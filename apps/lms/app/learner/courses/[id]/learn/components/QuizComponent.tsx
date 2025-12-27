"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  id?: string
}

interface QuizProps {
  quiz: {
    questions: QuizQuestion[]
    showResultsImmediately?: boolean
    allowMultipleAttempts?: boolean
    showCorrectAnswers?: boolean
    maxAttempts?: number
  }
  onComplete: (answers?: number[], questions?: QuizQuestion[], attemptCount?: number) => void
  onContinue?: () => void
  minimumQuizScore?: number
  courseId?: string
  lessonId?: number
  prefilledAnswers?: number[]
  showResultsOnly?: boolean
  onRetry?: () => void
  initialScore?: number
  previewMode?: boolean // If true, skip API calls (for admin preview)
}

export default function QuizComponent({
  quiz,
  onComplete,
  onContinue,
  minimumQuizScore = 50,
  courseId,
  lessonId,
  prefilledAnswers = [],
  showResultsOnly = false,
  onRetry,
  initialScore,
  previewMode = false,
}: QuizProps) {
  // Use questions in original order (no shuffling)
  const questions = useMemo(() => {
    return quiz.questions || []
  }, [quiz.questions])

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [originalAnswers, setOriginalAnswers] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const quizCompletedRef = useRef(false) // Track if quiz has been completed

  // Answers are already in original order (no mapping needed)
  const mappedAnswersForReview = useMemo(() => {
    if (!showResultsOnly || prefilledAnswers.length === 0) return []
    return prefilledAnswers
  }, [showResultsOnly, prefilledAnswers])

  // Reset quiz when questions change or initialize with prefilled answers
  // Don't reset if quiz has been completed
  useEffect(() => {
    // Don't reset if quiz has been completed
    if (quizCompletedRef.current) return
    
    setCurrentQuestion(0)
    // If quiz was already completed (showResultsOnly is true), show results screen
    if (showResultsOnly) {
      // Mark as completed to prevent reset
      quizCompletedRef.current = true
      
      if (prefilledAnswers.length > 0) {
        setSelectedAnswers(mappedAnswersForReview)
        setShowResults(true)
        setOriginalAnswers(mappedAnswersForReview)
      } else {
        // Even if no prefilled answers, show results if quiz was completed
        setShowResults(true)
        setSelectedAnswers([])
        setOriginalAnswers([])
      }
    } else {
      setSelectedAnswers([])
      setShowResults(false)
    }
  }, [questions, showResultsOnly, prefilledAnswers, mappedAnswersForReview])

  const handleAnswerSelect = (answerIndex: number) => {
    const newSelectedAnswers = [...selectedAnswers]
    newSelectedAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newSelectedAnswers)
  }

  const submitQuizResults = async () => {
    // Skip API call in preview mode
    if (previewMode) {
      console.log("Preview mode: Skipping quiz results API call")
      return
    }

    if (!courseId || !lessonId) {
      console.warn("Cannot submit quiz results: courseId or lessonId missing")
      return
    }

    try {
      setSubmitting(true)
      setSubmissionError(null)

      // Prepare answers array with question IDs
      // Use question.id if available, otherwise use index as fallback
      const answers = questions.map((question, index) => {
        // question.id might be a string or number, ensure we send it as-is
        // The API will match by ID, so we need to send the actual question ID
        const questionId = question.id 
          ? (typeof question.id === 'string' ? question.id : String(question.id))
          : String(index)
        
        return {
          questionId: questionId,
          userAnswer: selectedAnswers[index] ?? null,
        }
      })
      
      console.log("Submitting quiz answers:", { lessonId, answers, questionsCount: questions.length })

      const response = await fetch(`/api/courses/${courseId}/quiz-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          answers,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to submit quiz results")
      }

      const data = await response.json()
      console.log("Quiz results submitted successfully:", data)
    } catch (error: any) {
      console.error("Error submitting quiz results:", error)
      setSubmissionError(error.message || "Failed to save quiz results")
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextQuestion = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Mark quiz as completed to prevent reset
      quizCompletedRef.current = true
      
      // Store original answers before showing results
      setOriginalAnswers([...selectedAnswers])
      
      // Submit quiz results to API
      await submitQuizResults()
      
      // Always show results screen after quiz completion
      setShowResults(true)
      setAttemptCount((prev) => prev + 1)
      
      // Call onComplete to save progress and mark lesson as completed
      // This must be called to save to progress table and complete the lesson
      onComplete(selectedAnswers, questions, attemptCount + 1)
    }
  }

  const calculateScore = () => {
    let score = 0
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score++
      }
    })
    return score
  }

  const handleRetryQuiz = () => {
    // Check if multiple attempts are allowed
    if (!quiz.allowMultipleAttempts && attemptCount > 0) {
      return // Don't allow retry if multiple attempts are disabled
    }
    
    // Check if max attempts limit has been reached
    const maxAttempts = quiz.maxAttempts || 3
    if (attemptCount >= maxAttempts) {
      console.log(`Max attempts (${maxAttempts}) reached. Cannot retry.`)
      return // Don't allow retry if max attempts reached
    }
    
    // Reset completion flag for retry
    quizCompletedRef.current = false
    
    // Clear old quiz data before retrying
    if (onRetry) {
      onRetry()
    }
    
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setShowResults(false)
  }

  if (!quiz?.questions || questions.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No quiz available for this lesson.</p>
      </div>
    )
  }

  if (showResults) {
    // If showing results for a previously completed quiz, use initialScore if available
    // Otherwise calculate from current answers
    const score = showResultsOnly && initialScore !== undefined 
      ? Math.round((initialScore / 100) * questions.length)
      : calculateScore()
    const percentage = showResultsOnly && initialScore !== undefined 
      ? initialScore 
      : (score / questions.length) * 100
    const passed = percentage >= minimumQuizScore
    const maxAttempts = quiz.maxAttempts || 3
    const canRetry = (quiz.allowMultipleAttempts !== false) && (attemptCount < maxAttempts)

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold">Quiz Results</h3>
          <div className="w-24 h-24 mx-auto relative">
            <svg className="w-24 h-24" viewBox="0 0 100 100">
              <circle
                className="text-muted stroke-current dark:text-muted-foreground"
                strokeWidth="10"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              ></circle>
              <circle
                className={passed ? "text-green-500 stroke-current" : "text-red-500 stroke-current"}
                strokeWidth="10"
                strokeLinecap="round"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={`${percentage * 2.51327}, 251.327`}
                transform="rotate(-90 50 50)"
              ></circle>
              <text
                x="50"
                y="50"
                fontFamily="Verdana"
                fontSize="16"
                textAnchor="middle"
                alignmentBaseline="central"
                className="fill-current text-foreground dark:text-foreground"
              >{`${percentage.toFixed(0)}%`}</text>
            </svg>
          </div>
          <p className="text-xl">
            You scored <span className="font-bold">{score}</span> out of{" "}
            <span className="font-bold">{questions.length}</span>
          </p>
          {passed ? (
            <p className="text-green-500 font-semibold">Congratulations! You passed the quiz.</p>
          ) : (
            <p className="text-red-500 font-semibold">
              You need {minimumQuizScore}% to pass. {canRetry ? "Try again!" : "Please contact your instructor."}
            </p>
          )}
          {submissionError && (
            <p className="text-sm text-destructive mt-2">
              Note: {submissionError} (Results may not be saved)
            </p>
          )}
          {submitting && (
            <p className="text-sm text-muted-foreground mt-2">Saving quiz results...</p>
          )}
        </div>

        {/* Show answer review */}
        {quiz.showCorrectAnswers && (
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
            <h4 className="font-semibold text-lg">Review Your Answers</h4>
              {!passed && attemptCount < maxAttempts && (
                <p className="text-sm text-muted-foreground">
                  Attempt {attemptCount} of {maxAttempts}. Correct answers will be revealed after your final attempt.
                </p>
              )}
            </div>
            <div className="space-y-4">
              {/* Questions always in original order */}
              {questions.map((question, index) => {
                // Get user answer for this question
                const userAnswer = showResultsOnly 
                  ? mappedAnswersForReview[index] 
                  : originalAnswers[index]
                
                // Use question's correct answer
                const correctAnswerIndex = question.correctAnswer
                
                const isCorrect = userAnswer === correctAnswerIndex
                const canSeeCorrectAnswer = passed || attemptCount >= maxAttempts
                
                return (
                  <div key={index} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <p className="font-medium">Question {index + 1}</p>
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm">{question.question}</p>
                    <div className="space-y-1">
                      {question.options.map((option, optIndex) => {
                        const isUserAnswer = userAnswer === optIndex
                        const isCorrectAnswer = optIndex === correctAnswerIndex
                        
                        // Only highlight correct answer if user can see it
                        const showCorrectAnswer = canSeeCorrectAnswer && isCorrectAnswer
                        const showWrongAnswer = isUserAnswer && !isCorrect
                        const showUserCorrectAnswer = isUserAnswer && isCorrect
                        
                        return (
                          <div
                            key={optIndex}
                            className={`p-2 rounded text-sm ${
                              showCorrectAnswer || showUserCorrectAnswer
                                ? "bg-green-100 dark:bg-green-900/30 border border-green-500"
                                : showWrongAnswer
                                ? "bg-red-100 dark:bg-red-900/30 border border-red-500"
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {(showCorrectAnswer || showUserCorrectAnswer) && (
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                              {showWrongAnswer && (
                                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              )}
                              <span>{option}</span>
                              {showUserCorrectAnswer && <span className="text-xs text-green-600 dark:text-green-400 ml-auto">Your Answer</span>}
                              {showCorrectAnswer && !isUserAnswer && <span className="text-xs text-green-600 dark:text-green-400 ml-auto">Correct Answer</span>}
                              {showWrongAnswer && <span className="text-xs text-red-600 dark:text-red-400 ml-auto">Your Answer</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <div className="flex justify-center gap-4">
          {canRetry && (
            <Button onClick={handleRetryQuiz} variant="outline">
              Retry Quiz
            </Button>
          )}
          {passed && (
            <Button onClick={() => {
              // Continue button only navigates - no actions
              onContinue?.()
            }} className="bg-primary hover:bg-primary/90">
              Continue
            </Button>
          )}
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">
          Question {currentQuestion + 1} of {questions.length}
        </h3>
        <p className="text-lg">{question.question}</p>
      </div>

      <Card className="border-border bg-card p-4 space-y-4">
        <RadioGroup 
          value={selectedAnswers[currentQuestion] !== undefined ? selectedAnswers[currentQuestion].toString() : ""} 
          onValueChange={(value) => handleAnswerSelect(Number.parseInt(value))} 
          className="space-y-1"
        >
          {question.options.map((option, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 py-1 px-2 rounded-md hover:bg-accent hover:text-accent-foreground"
            >
              <RadioGroupItem value={index.toString()} id={`answer-${index}`} className="border-primary text-primary" />
              <Label htmlFor={`answer-${index}`} className="flex-grow cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </Card>

      <Button 
        onClick={handleNextQuestion} 
        disabled={selectedAnswers[currentQuestion] === undefined || submitting} 
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : currentQuestion === questions.length - 1 ? (
          "Finish Quiz"
        ) : (
          "Next Question"
        )}
      </Button>
    </div>
  )
}
