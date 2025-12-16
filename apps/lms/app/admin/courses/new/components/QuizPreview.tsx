"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"
import { Question } from "../types/quiz"

interface QuizPreviewProps {
  questions: Question[]
  passingScore: number
}

export default function QuizPreview({ questions, passingScore }: QuizPreviewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({})
  const [submitted, setSubmitted] = useState(false)

  const calculateScore = () => {
    let correct = 0
    questions.forEach((question, index) => {
      const answer = selectedAnswers[index]
      if (answer === undefined) return

      switch (question.type) {
        case "multiple-choice":
          if (answer === question.correctOption) correct++
          break
        case "true-false":
          if (answer === question.correctAnswer) correct++
          break
        case "fill-blank":
          if (question.correctAnswers.some((a) => a.toLowerCase() === answer.toLowerCase())) correct++
          break
        case "short-answer":
          if (
            question.correctKeywords.some((keyword) =>
              answer.toLowerCase().includes(keyword.toLowerCase())
            )
          )
            correct++
          break
        default:
          break
      }
    })
    return Math.round((correct / questions.length) * 100)
  }

  const score = submitted ? calculateScore() : 0
  const passed = score >= passingScore

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quiz Preview</h3>
        {submitted && (
          <Badge variant={passed ? "default" : "destructive"} className="bg-green-500">
            {passed ? "Passed" : "Failed"} - {score}%
          </Badge>
        )}
      </div>

      {questions.map((question, qIndex) => {
        const answer = selectedAnswers[qIndex]
        const isCorrect = submitted && (() => {
          switch (question.type) {
            case "multiple-choice":
              return answer === question.correctOption
            case "true-false":
              return answer === question.correctAnswer
            default:
              return false
          }
        })()

        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base">
                Question {qIndex + 1}
                {submitted && (
                  <span className="ml-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 inline" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    )}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium">{question.text}</p>

              {question.type === "multiple-choice" && (
                <RadioGroup
                  value={answer?.toString()}
                  onValueChange={(value) =>
                    setSelectedAnswers({ ...selectedAnswers, [qIndex]: Number.parseInt(value) })
                  }
                  disabled={submitted}
                >
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={oIndex.toString()} id={`preview-q${qIndex}-o${oIndex}`} />
                      <Label htmlFor={`preview-q${qIndex}-o${oIndex}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {question.type === "true-false" && (
                <RadioGroup
                  value={answer?.toString()}
                  onValueChange={(value) =>
                    setSelectedAnswers({ ...selectedAnswers, [qIndex]: value === "true" })
                  }
                  disabled={submitted}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id={`preview-q${qIndex}-true`} />
                    <Label htmlFor={`preview-q${qIndex}-true`} className="cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id={`preview-q${qIndex}-false`} />
                    <Label htmlFor={`preview-q${qIndex}-false`} className="cursor-pointer">False</Label>
                  </div>
                </RadioGroup>
              )}

              {submitted && question.explanation && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Explanation:</p>
                  <p className="text-sm text-muted-foreground">{question.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <div className="flex justify-end">
        {!submitted ? (
          <Button onClick={() => setSubmitted(true)}>Submit Quiz</Button>
        ) : (
          <div className="p-4 bg-muted rounded-lg w-full">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Your Score: {score}%</span>
              <span className={passed ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {passed ? "Passed!" : `Failed (Need ${passingScore}%)`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

