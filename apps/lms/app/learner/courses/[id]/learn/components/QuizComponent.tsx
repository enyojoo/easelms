"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

interface QuizProps {
  quiz: {
    questions: {
      question: string
      options: string[]
      correctAnswer: number
    }[]
  }
  onComplete: () => void
  minimumQuizScore?: number
}

export default function QuizComponent({ quiz, onComplete, minimumQuizScore = 50 }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleAnswerSelect = (answerIndex: number) => {
    const newSelectedAnswers = [...selectedAnswers]
    newSelectedAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newSelectedAnswers)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResults(true)
    }
  }

  const calculateScore = () => {
    let score = 0
    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score++
      }
    })
    return score
  }

  const handleRetryQuiz = () => {
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setShowResults(false)
  }

  if (!quiz?.questions) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No quiz available for this lesson.</p>
      </div>
    )
  }

  if (showResults) {
    const score = calculateScore()
    const percentage = (score / quiz.questions.length) * 100

    return (
      <div className="text-center space-y-6">
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
              className="text-primary stroke-current dark:text-primary"
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
          <span className="font-bold">{quiz.questions.length}</span>
        </p>
        {percentage >= minimumQuizScore ? (
          <p className="text-green-500">Congratulations! You passed the quiz.</p>
        ) : (
          <p className="text-red-500">You need {minimumQuizScore}% to pass. Try again!</p>
        )}
        <Button onClick={handleRetryQuiz} className="mt-4">
          Retry Quiz
        </Button>
      </div>
    )
  }

  const question = quiz.questions[currentQuestion]

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </h3>
        <p className="text-lg">{question.question}</p>
      </div>

      <Card className="border-border bg-card p-4 space-y-4">
        <RadioGroup onValueChange={(value) => handleAnswerSelect(Number.parseInt(value))} className="space-y-1">
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
        {currentQuestion === quiz.questions.length - 1 ? "Finish Quiz" : "Next Question"}
      </Button>
    </div>
  )
}
