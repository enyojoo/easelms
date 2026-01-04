"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2, Info, ArrowRight, RotateCcw } from "lucide-react"
import SafeImage from "@/components/SafeImage"

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  id?: string
  points?: number
  imageUrl?: string
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
  const [quizStarted, setQuizStarted] = useState(false) // Track if user has started the quiz
  const quizCompletedRef = useRef(false) // Track if quiz has been completed

  // Answers are already in original order (no mapping needed)
  const mappedAnswersForReview = useMemo(() => {
    if (!showResultsOnly || prefilledAnswers.length === 0) return []
    return prefilledAnswers
  }, [showResultsOnly, prefilledAnswers])

  // Reset all state when lessonId changes (switching to a different lesson)
  useEffect(() => {
    if (lessonId !== undefined) {
      // Reset all state when lesson changes
      quizCompletedRef.current = false
      setCurrentQuestion(0)
      setSelectedAnswers([])
      setShowResults(false)
      setQuizStarted(false)
      setAttemptCount(0)
      setOriginalAnswers([])
      setSubmissionError(null)
    }
  }, [lessonId])

  // Reset quiz when questions change or initialize with prefilled answers
  // Don't reset if quiz has been completed (unless retrying)
  useEffect(() => {
    // Skip if we're in the middle of a retry (quizCompletedRef is false means we're retrying)
    // In retry mode, handleRetryQuiz has already reset the state, so we don't need to do anything here
    if (!quizCompletedRef.current) {
      // We're retrying - state was already reset in handleRetryQuiz, so don't interfere
      return
    }
    
    // If quiz was completed (showResultsOnly is true), show results screen
    if (showResultsOnly) {
      setCurrentQuestion(0)
      setShowResults(true) // Always show results when showResultsOnly is true
      if (prefilledAnswers.length > 0) {
        setSelectedAnswers(mappedAnswersForReview)
        setOriginalAnswers(mappedAnswersForReview)
      } else {
        setSelectedAnswers([])
        setOriginalAnswers([])
      }
      return
    }
    
    // Quiz hasn't been completed yet - reset to initial state
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setShowResults(false)
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
    let pointsEarned = 0
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        // Use points if available, otherwise default to 1
        pointsEarned += question.points || 1
      }
    })
    return pointsEarned
  }
  
  const calculateTotalPoints = () => {
    return questions.reduce((total, question) => total + (question.points || 1), 0)
  }

  const handleRetryQuiz = async () => {
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
    
    // Reset completion flag for retry BEFORE clearing data
    quizCompletedRef.current = false
    
    // Reset local state first to prevent flicker
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setShowResults(false)
    setQuizStarted(false) // Reset quiz started state to show info card again
    
    // Clear old quiz data (this will trigger refetch, but we've already reset local state)
    if (onRetry) {
      await onRetry()
    }
  }

  if (!quiz?.questions || questions.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No quiz available for this lesson.</p>
      </div>
    )
  }

  // Show results if showResultsOnly is true (quiz was already completed) OR if showResults state is true (just completed)
  if (showResultsOnly || showResults) {
    // If showing results for a previously completed quiz, use initialScore if available
    // Otherwise calculate from current answers
    const totalPoints = calculateTotalPoints()
    const pointsEarned = showResultsOnly && initialScore !== undefined 
      ? Math.round((initialScore / 100) * totalPoints)
      : calculateScore()
    const percentage = showResultsOnly && initialScore !== undefined 
      ? initialScore 
      : totalPoints > 0 ? (pointsEarned / totalPoints) * 100 : 0
    const passed = percentage >= minimumQuizScore
    const maxAttempts = quiz.maxAttempts || 3
    const canRetry = (quiz.allowMultipleAttempts !== false) && (attemptCount < maxAttempts)

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Results Header */}
        <Card className={`border-2 ${passed ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"}`}>
          <CardContent className="p-6 md:p-8">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold mb-2">Quiz Results</h3>
                {attemptCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Attempt {attemptCount} of {maxAttempts}
                  </Badge>
                )}
              </div>
              
              {/* Score Circle */}
              <div className="w-32 h-32 mx-auto relative">
                <svg className="w-32 h-32" viewBox="0 0 100 100">
                  <circle
                    className="text-muted stroke-current dark:text-muted-foreground"
                    strokeWidth="8"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                  ></circle>
                  <circle
                    className={passed ? "text-green-500 stroke-current" : "text-red-500 stroke-current"}
                    strokeWidth="8"
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
                    fontSize="20"
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="central"
                    className="fill-current text-foreground dark:text-foreground"
                  >{`${percentage.toFixed(0)}%`}</text>
                </svg>
              </div>
              
              {/* Score Details */}
              <div className="space-y-2">
                <p className="text-xl md:text-2xl">
                  You scored <span className="font-bold text-primary">{pointsEarned}</span> out of{" "}
                  <span className="font-bold">{totalPoints}</span> points
                </p>
                {passed ? (
                  <div className="space-y-2">
                    <p className="text-lg md:text-xl text-green-600 dark:text-green-400 font-semibold">
                      🎉 Congratulations! You passed the quiz.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg md:text-xl text-red-600 dark:text-red-400 font-semibold">
                      You need {minimumQuizScore}% ({minimumPointsNeeded} points) to pass.
                    </p>
                    {canRetry && (
                      <p className="text-sm text-muted-foreground">You can retry the quiz to improve your score.</p>
                    )}
                  </div>
                )}
              </div>
              
              {submissionError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">
                    Note: {submissionError} (Results may not be saved)
                  </p>
                </div>
              )}
              {submitting && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving quiz results...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Show answer review */}
        {quiz.showCorrectAnswers && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">Review Your Answers</h4>
              {attemptCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  Attempt {attemptCount} of {maxAttempts}
                </Badge>
              )}
            </div>
            <div className="space-y-4">
              {/* Questions always in original order */}
              {questions.map((question, index) => {
                // Get user answer for this question
                const userAnswer = showResultsOnly 
                  ? mappedAnswersForReview[index] 
                  : originalAnswers[index]
                
                // Use question's correct answer (for calculation only, not displayed)
                const correctAnswerIndex = question.correctAnswer
                
                const isCorrect = userAnswer === correctAnswerIndex
                
                return (
                  <Card key={index} className={`${isCorrect ? "border-green-500/50 bg-green-50/30 dark:bg-green-950/10" : "border-red-500/50 bg-red-50/30 dark:bg-red-950/10"}`}>
                    <CardContent className="p-4 md:p-6 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-base">Question {index + 1}</p>
                            {question.points && question.points > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {question.points} {question.points === 1 ? "point" : "points"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm md:text-base leading-relaxed">{question.question}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {isCorrect ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-500" />
                          )}
                        </div>
                      </div>
                      
                      {/* Question Image */}
                      {question.imageUrl && (
                        <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-lg overflow-hidden border bg-muted">
                          <SafeImage 
                            src={question.imageUrl} 
                            alt={`Question ${index + 1} image`} 
                            fill 
                            className="object-contain" 
                          />
                        </div>
                      )}
                    <div className="space-y-1">
                      {question.options.map((option, optIndex) => {
                        const isUserAnswer = userAnswer === optIndex
                        const showUserCorrectAnswer = isUserAnswer && isCorrect
                        const showWrongAnswer = isUserAnswer && !isCorrect
                        
                        return (
                          <div
                            key={optIndex}
                            className={`p-3 md:p-4 rounded-lg text-sm md:text-base transition-colors ${
                              showUserCorrectAnswer
                                ? "bg-green-100 dark:bg-green-900/40 border-2 border-green-500"
                                : showWrongAnswer
                                ? "bg-red-100 dark:bg-red-900/40 border-2 border-red-500"
                                : "bg-muted/50 border border-border"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {showUserCorrectAnswer && (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              )}
                              {showWrongAnswer && (
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                              )}
                              <span className="flex-1">{option}</span>
                              {isUserAnswer && (
                                <Badge variant="secondary" className={`text-xs ${
                                  showUserCorrectAnswer
                                    ? "bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200"
                                    : "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200"
                                }`}>
                                  Your Answer
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              {canRetry && (
                <Button 
                  onClick={handleRetryQuiz} 
                  variant="outline"
                  size="lg"
                  className="min-h-[44px]"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retry Quiz
                </Button>
              )}
              {passed && onContinue && (
                <Button 
                  onClick={() => onContinue()} 
                  className="bg-primary hover:bg-primary/90 min-h-[44px]"
                  size="lg"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const maxAttempts = quiz.maxAttempts || 3
  const totalPoints = calculateTotalPoints()
  const minimumPointsNeeded = Math.ceil((minimumQuizScore / 100) * totalPoints)

  // Show quiz info card before starting (when quiz hasn't been started yet AND not showing results)
  // Don't show info card if showResultsOnly is true (quiz was already completed)
  if (!showResultsOnly && !quizStarted && currentQuestion === 0 && selectedAnswers.length === 0 && !showResults) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Quiz Information</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Questions:</span>
                    <span className="font-medium text-foreground">{questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Points:</span>
                    <span className="font-medium text-foreground">{totalPoints}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Minimum Score to Pass:</span>
                    <span className="font-medium text-foreground">{minimumQuizScore}%</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 mt-2">
                    <span>Points Needed to Pass:</span>
                    <span className="font-semibold text-primary">{minimumPointsNeeded} / {totalPoints}</span>
                  </div>
                  {maxAttempts > 1 && (
                    <div className="flex items-center justify-between">
                      <span>Attempts Allowed:</span>
                      <span className="font-medium text-foreground">{maxAttempts}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setQuizStarted(true)}
              className="w-full"
              size="lg"
            >
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Question Header */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold">
                Question {currentQuestion + 1} of {questions.length}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {question.points && question.points > 0 && (
                <Badge variant="outline" className="text-sm">
                  {question.points} {question.points === 1 ? "point" : "points"}
                </Badge>
              )}
              {attemptCount > 0 && (
                <Badge variant="secondary" className="text-sm">
                  Attempt {attemptCount} of {maxAttempts}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Question Text */}
          <p className="text-base md:text-lg leading-relaxed mb-4">{question.question}</p>
          
          {/* Question Image */}
          {question.imageUrl && (
            <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-lg overflow-hidden border bg-muted mb-4">
              <SafeImage 
                src={question.imageUrl} 
                alt={`Question ${currentQuestion + 1} image`} 
                fill 
                className="object-contain" 
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Answer Options */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <RadioGroup 
            value={selectedAnswers[currentQuestion] !== undefined ? selectedAnswers[currentQuestion].toString() : ""} 
            onValueChange={(value) => handleAnswerSelect(Number.parseInt(value))} 
            className="space-y-3"
          >
            {question.options.map((option, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer"
              >
                <RadioGroupItem 
                  value={index.toString()} 
                  id={`answer-${index}`} 
                  className="border-2 border-primary text-primary h-5 w-5" 
                />
                <Label 
                  htmlFor={`answer-${index}`} 
                  className="flex-grow cursor-pointer text-base md:text-lg leading-relaxed"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
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
