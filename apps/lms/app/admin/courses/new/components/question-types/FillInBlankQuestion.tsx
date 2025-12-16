"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, X } from "lucide-react"
import { FillInBlankQuestion as FIBQuestionType } from "../types/quiz"

interface FillInBlankQuestionProps {
  question: FIBQuestionType
  onChange: (question: FIBQuestionType) => void
  onDelete?: () => void
}

export default function FillInBlankQuestion({ question, onChange, onDelete }: FillInBlankQuestionProps) {
  const updateQuestion = (updates: Partial<FIBQuestionType>) => {
    onChange({ ...question, ...updates })
  }

  const addAnswer = () => {
    updateQuestion({
      correctAnswers: [...question.correctAnswers, ""],
    })
  }

  const removeAnswer = (index: number) => {
    if (question.correctAnswers.length > 1) {
      updateQuestion({
        correctAnswers: question.correctAnswers.filter((_, i) => i !== index),
      })
    }
  }

  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...question.correctAnswers]
    newAnswers[index] = value
    updateQuestion({ correctAnswers: newAnswers })
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label>Question Text (use _____ for blank)</Label>
            <Input
              value={question.text}
              onChange={(e) => updateQuestion({ text: e.target.value })}
              placeholder="Enter your question with _____ for the blank..."
            />
            <p className="text-xs text-muted-foreground">
              Example: "The capital of France is _____"
            </p>
          </div>

          <div className="space-y-2">
            <Label>Correct Answers</Label>
            <div className="space-y-2">
              {question.correctAnswers.map((answer, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={answer}
                    onChange={(e) => updateAnswer(index, e.target.value)}
                    placeholder={`Correct answer ${index + 1}`}
                    className="flex-1"
                  />
                  {question.correctAnswers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAnswer(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addAnswer} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Alternative Answer
            </Button>
            <p className="text-xs text-muted-foreground">
              Add multiple correct answers if variations are acceptable
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Case Sensitive</Label>
              <p className="text-sm text-muted-foreground">Require exact case matching</p>
            </div>
            <Switch
              checked={question.caseSensitive || false}
              onCheckedChange={(checked) => updateQuestion({ caseSensitive: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Explanation (shown after answer)</Label>
            <Input
              value={question.explanation || ""}
              onChange={(e) => updateQuestion({ explanation: e.target.value })}
              placeholder="Optional explanation for the correct answer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Points</Label>
              <p className="text-sm text-muted-foreground">Points awarded for correct answer</p>
            </div>
            <Input
              type="number"
              min="1"
              value={question.points}
              onChange={(e) => updateQuestion({ points: Number.parseInt(e.target.value) || 1 })}
              className="w-20"
            />
          </div>
        </div>
        {onDelete && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="ml-4">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

