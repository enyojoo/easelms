"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle } from "lucide-react"

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  id?: string
}

interface QuizProps {
  quiz: {
    questions: QuizQuestion[]
    shuffleQuestions?: boolean
    shuffleAnswers?: boolean
    showResultsImmediately?: boolean
    allowMultipleAttempts?: boolean
    showCorrectAnswers?: boolean
  }
  onComplete: () => void
  minimumQuizScore?: number
  courseId?: string
  lessonId?: number
}

export default function QuizComponent({ quiz, onComplete, minimumQuizScore = 50, courseId, lessonId }: QuizProps) {
  // Shuffle questions if enabled (only once on mount)
  const shuffledQuestions = useMemo(() => {
    if (!quiz.questions || quiz.questions.length === 0) return []
    
    let questions = [...quiz.questions]
    
    // Shuffle questions if enabled
    if (quiz.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5)
    }
    
    // Shuffle answers for each question if enabled
    if (quiz.shuffleAnswers) {
      questions = questions.map((q) => {
        const options = [...q.options]
        const correctIndex = q.correctAnswer
        
        // Create array of indices and shuffle them
        const indices = options.map((_, i) => i)
        const shuffledIndices = indices.sort(() => Math.random() - 0.5)
        
        // Find new position of correct answer
        const newCorrectIndex = shuffledIndices.indexOf(correctIndex)
        
        // Shuffle options
        const shuffledOptions = shuffledIndices.map((i) => options[i])
        
        return {
          ...q,
          options: shuffledOptions,
          correctAnswer: newCorrectIndex,
        }
      })
    }
    
    return questions
  }, [quiz.questions, quiz.shuffleQuestions, quiz.shuffleAnswers])

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [originalAnswers, setOriginalAnswers] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  // Reset quiz when questions change
  useEffect(() => {
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setShowResults(false)
  }, [shuffledQuestions])

  const handleAnswerSelect = (answerIndex: number) => {
    const newSelectedAnswers = [...selectedAnswers]
    newSelectedAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newSelectedAnswers)
  }

  const submitQuizResults = async () => {
    if (!courseId || !lessonId) {
      console.warn("Cannot submit quiz results: courseId or lessonId missing")
      return
    }

    try {
      setSubmitting(true)
      setSubmissionError(null)

      // Prepare answers array with question IDs
      // Map shuffled questions back to original question IDs
      const answers = shuffledQuestions.map((question, shuffledIndex) => {
        // Find the original question index in the original quiz.questions array
        const originalIndex = quiz.questions.findIndex(
          (q) => q.id === question.id || (q.question === question.question && q.options?.join(",") === question.options?.join(","))
        )
        const originalQuestion = originalIndex >= 0 ? quiz.questions[originalIndex] : question
        
        return {
          questionId: originalQuestion.id ? parseInt(originalQuestion.id) : shuffledIndex,
          userAnswer: selectedAnswers[shuffledIndex] ?? null,
        }
      })

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
    if (currentQuestion < shuffledQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // Store original answers before showing results
      setOriginalAnswers([...selectedAnswers])
      
      // Submit quiz results to API
      await submitQuizResults()
      
      // Show results immediately if enabled, otherwise wait
      if (quiz.showResultsImmediately) {
        setShowResults(true)
        setAttemptCount((prev) => prev + 1)
      } else {
        // For non-immediate results, we still show them but could delay
        setShowResults(true)
        setAttemptCount((prev) => prev + 1)
      }
    }
  }

  const calculateScore = () => {
    let score = 0
    shuffledQuestions.forEach((question, index) => {
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
    
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setShowResults(false)
    // Note: Questions will be reshuffled on next render due to useMemo
  }

  if (!quiz?.questions || shuffledQuestions.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No quiz available for this lesson.</p>
      </div>
    )
  }

  if (showResults) {
    const score = calculateScore()
    const percentage = (score / shuffledQuestions.length) * 100
    const passed = percentage >= minimumQuizScore
    const canRetry = quiz.allowMultipleAttempts !== false // Default to true if not specified

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
            <span className="font-bold">{shuffledQuestions.length}</span>
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

        {/* Show correct answers if enabled */}
        {quiz.showCorrectAnswers && (
          <Card className="p-6 space-y-4">
            <h4 className="font-semibold text-lg">Review Your Answers</h4>
            <div className="space-y-4">
              {shuffledQuestions.map((question, index) => {
                const userAnswer = originalAnswers[index]
                const isCorrect = userAnswer === question.correctAnswer
                
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
                        const isCorrectAnswer = optIndex === question.correctAnswer
                        
                        return (
                          <div
                            key={optIndex}
                            className={`p-2 rounded text-sm ${
                              isCorrectAnswer
                                ? "bg-green-100 dark:bg-green-900/30 border border-green-500"
                                : isUserAnswer && !isCorrect
                                ? "bg-red-100 dark:bg-red-900/30 border border-red-500"
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isCorrectAnswer && (
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                              {isUserAnswer && !isCorrect && (
                                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              )}
                              <span>{option}</span>
                              {isCorrectAnswer && <span className="text-xs text-green-600 dark:text-green-400 ml-auto">Correct Answer</span>}
                              {isUserAnswer && !isCorrect && <span className="text-xs text-red-600 dark:text-red-400 ml-auto">Your Answer</span>}
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
            <Button onClick={onComplete} className="bg-primary hover:bg-primary/90">
              Continue
            </Button>
          )}
        </div>
      </div>
    )
  }

  const question = shuffledQuestions[currentQuestion]

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">
          Question {currentQuestion + 1} of {shuffledQuestions.length}
        </h3>
        <p className="text-lg">{question.question}</p>
      </div>

      <Card className="border-border bg-card p-4 space-y-4">
        <RadioGroup 
          value={selectedAnswers[currentQuestion]?.toString()} 
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

      <Button onClick={handleNextQuestion} disabled={selectedAnswers[currentQuestion] === undefined} className="w-full">
        {currentQuestion === shuffledQuestions.length - 1 ? "Finish Quiz" : "Next Question"}
      </Button>
    </div>
  )
}
