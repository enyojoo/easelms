"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Lightbulb, 
  RotateCcw,
  Target,
  Award,
  Brain,
  Zap,
  Star,
  Trophy
} from "lucide-react"
import { toast } from "sonner"

interface InteractiveQuizProps {
  quiz: {
    questions: QuizQuestion[]
    timeLimit?: number
    passingScore?: number
  }
  onComplete: (results: QuizResults) => void
  showHints?: boolean
  allowRetry?: boolean
}

interface QuizQuestion {
  id: string
  question: string
  type: "multiple-choice" | "true-false" | "drag-drop" | "matching" | "fill-blank" | "sorting"
  options?: string[]
  correctAnswer: number | string | string[]
  explanation?: string
  points: number
  difficulty: "easy" | "medium" | "hard"
  hints?: string[]
}

interface QuizResults {
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  accuracy: number
  grade: string
  feedback: string
  achievements: string[]
}

export default function InteractiveQuiz({ 
  quiz, 
  onComplete, 
  showHints = true,
  allowRetry = true 
}: InteractiveQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: string]: any }>({})
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit || 0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [achievements, setAchievements] = useState<string[]>([])

  const currentQ = quiz.questions[currentQuestion]

  useEffect(() => {
    if (quiz.timeLimit && quiz.timeLimit > 0) {
      setTimeRemaining(quiz.timeLimit)
    }
  }, [quiz.timeLimit])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeRemaining > 0 && !isCompleted) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timeRemaining, isCompleted])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswer = (answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: answer
    }))
  }

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setShowHint(false)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
      setShowHint(false)
    }
  }

  const handleSubmit = () => {
    const results = calculateResults()
    setQuizResults(results)
    setIsCompleted(true)
    setShowResults(true)
    onComplete(results)
  }

  const calculateResults = (): QuizResults => {
    let correctAnswers = 0
    let totalPoints = 0
    let earnedPoints = 0

    quiz.questions.forEach(question => {
      totalPoints += question.points
      const userAnswer = answers[question.id]
      
      if (userAnswer !== undefined) {
        let isCorrect = false
        
        if (question.type === "multiple-choice" || question.type === "true-false") {
          isCorrect = userAnswer === question.correctAnswer
        } else if (question.type === "fill-blank") {
          isCorrect = userAnswer.toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim()
        } else if (question.type === "drag-drop" || question.type === "matching" || question.type === "sorting") {
          isCorrect = JSON.stringify(userAnswer) === JSON.stringify(question.correctAnswer)
        }

        if (isCorrect) {
          correctAnswers++
          earnedPoints += question.points
        }
      }
    })

    const score = Math.round((earnedPoints / totalPoints) * 100)
    const accuracy = Math.round((correctAnswers / quiz.questions.length) * 100)
    
    let grade = "F"
    if (score >= 90) grade = "A"
    else if (score >= 80) grade = "B"
    else if (score >= 70) grade = "C"
    else if (score >= 60) grade = "D"

    const feedback = getFeedback(score, accuracy)
    const newAchievements = checkAchievements(score, accuracy, streak)

    return {
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      timeSpent: (quiz.timeLimit || 0) - timeRemaining,
      accuracy,
      grade,
      feedback,
      achievements: newAchievements
    }
  }

  const getFeedback = (score: number, accuracy: number): string => {
    if (score >= 90) return "Excellent work! You've mastered this topic! 🌟"
    if (score >= 80) return "Great job! You have a solid understanding! 👍"
    if (score >= 70) return "Good work! You're on the right track! ✅"
    if (score >= 60) return "Not bad! Review the material and try again! 📚"
    return "Keep studying! You'll get there! 💪"
  }

  const checkAchievements = (score: number, accuracy: number, currentStreak: number): string[] => {
    const newAchievements: string[] = []

    if (score === 100) {
      newAchievements.push("Perfect Score! 🎯")
    }
    if (accuracy === 100) {
      newAchievements.push("Flawless Victory! ⚡")
    }
    if (currentStreak >= 5) {
      newAchievements.push("Hot Streak! 🔥")
    }
    if (score >= 90) {
      newAchievements.push("Ace Student! 🏆")
    }
    if (timeRemaining > 0 && score >= 70) {
      newAchievements.push("Speed Demon! ⚡")
    }

    return newAchievements
  }

  const retryQuiz = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setTimeRemaining(quiz.timeLimit || 0)
    setIsCompleted(false)
    setShowResults(false)
    setQuizResults(null)
    setShowHint(false)
    setStreak(0)
    setAchievements([])
    toast.info("Quiz reset. Good luck!")
  }

  const renderQuestion = () => {
    if (!currentQ) return null

    const isAnswered = answers[currentQ.id] !== undefined
    const isCorrect = isAnswered && answers[currentQ.id] === currentQ.correctAnswer

    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Question {currentQuestion + 1} of {quiz.questions.length}</Badge>
              <Badge variant={currentQ.difficulty === "easy" ? "default" : currentQ.difficulty === "medium" ? "secondary" : "destructive"}>
                {currentQ.difficulty}
              </Badge>
              <Badge variant="outline">{currentQ.points} pts</Badge>
            </div>
            {quiz.timeLimit && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className={timeRemaining < 60 ? "text-red-600 font-bold" : ""}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
          <CardTitle className="text-lg">{currentQ.question}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Question Content */}
          <div className="space-y-3">
            {currentQ.type === "multiple-choice" && (
              <div className="space-y-2">
                {currentQ.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className={`w-full p-3 text-left border rounded-lg transition-all ${
                      answers[currentQ.id] === index
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        answers[currentQ.id] === index
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}>
                        {answers[currentQ.id] === index && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === "true-false" && (
              <div className="space-y-2">
                {["True", "False"].map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index === 0)}
                    className={`w-full p-3 text-left border rounded-lg transition-all ${
                      answers[currentQ.id] === (index === 0)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        answers[currentQ.id] === (index === 0)
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}>
                        {answers[currentQ.id] === (index === 0) && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentQ.type === "fill-blank" && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={answers[currentQ.id] || ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Answer Feedback */}
          {isAnswered && (
            <div className={`p-3 rounded-lg ${
              isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}>
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-semibold ${
                  isCorrect ? "text-green-800" : "text-red-800"
                }`}>
                  {isCorrect ? "Correct!" : "Incorrect"}
                </span>
              </div>
              {currentQ.explanation && (
                <p className={`text-sm mt-1 ${
                  isCorrect ? "text-green-700" : "text-red-700"
                }`}>
                  {currentQ.explanation}
                </p>
              )}
            </div>
          )}

          {/* Hints */}
          {showHints && currentQ.hints && currentQ.hints.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHint(!showHint)}
              >
                <Lightbulb className="h-4 w-4 mr-1" />
                {showHint ? "Hide Hint" : "Show Hint"}
              </Button>
              {showHint && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">{currentQ.hints[0]}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isAnswered}
            >
              {currentQuestion === quiz.questions.length - 1 ? "Submit" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderResults = () => {
    if (!quizResults) return null

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center">
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {quizResults.score}%
            </div>
            <div className="text-2xl font-semibold mb-4">
              Grade: {quizResults.grade}
            </div>
            <p className="text-lg text-muted-foreground">
              {quizResults.feedback}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {quizResults.correctAnswers}/{quizResults.totalQuestions}
              </div>
              <div className="text-sm text-blue-600">Correct Answers</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatTime(quizResults.timeSpent)}
              </div>
              <div className="text-sm text-green-600">Time Spent</div>
            </div>
          </div>

          {/* Achievements */}
          {quizResults.achievements.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-center">Achievements Unlocked! 🏆</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {quizResults.achievements.map((achievement, index) => (
                  <Badge key={index} variant="default" className="text-sm">
                    {achievement}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4">
            {allowRetry && (
              <Button onClick={retryQuiz} variant="outline">
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry Quiz
              </Button>
            )}
            <Button onClick={() => window.location.reload()}>
              Continue Learning
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showResults) {
    return renderResults()
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{currentQuestion + 1} of {quiz.questions.length}</span>
        </div>
        <Progress value={((currentQuestion + 1) / quiz.questions.length) * 100} />
      </div>

      {/* Question */}
      {renderQuestion()}
    </div>
  )
}
