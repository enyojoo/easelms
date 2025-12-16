"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, X } from "lucide-react"
import { ShortAnswerQuestion as SAQuestionType } from "../types/quiz"

interface ShortAnswerQuestionProps {
  question: SAQuestionType
  onChange: (question: SAQuestionType) => void
  onDelete?: () => void
}

export default function ShortAnswerQuestion({ question, onChange, onDelete }: ShortAnswerQuestionProps) {
  const updateQuestion = (updates: Partial<SAQuestionType>) => {
    onChange({ ...question, ...updates })
  }

  const addKeyword = () => {
    updateQuestion({
      correctKeywords: [...question.correctKeywords, ""],
    })
  }

  const removeKeyword = (index: number) => {
    if (question.correctKeywords.length > 1) {
      updateQuestion({
        correctKeywords: question.correctKeywords.filter((_, i) => i !== index),
      })
    }
  }

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...question.correctKeywords]
    newKeywords[index] = value
    updateQuestion({ correctKeywords: newKeywords })
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label>Question Text</Label>
            <Textarea
              value={question.text}
              onChange={(e) => updateQuestion({ text: e.target.value })}
              placeholder="Enter your short answer question..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Correct Keywords (for auto-grading)</Label>
            <div className="space-y-2">
              {question.correctKeywords.map((keyword, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={keyword}
                    onChange={(e) => updateKeyword(index, e.target.value)}
                    placeholder={`Keyword ${index + 1}`}
                    className="flex-1"
                  />
                  {question.correctKeywords.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeKeyword(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={addKeyword} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Keyword
            </Button>
            <p className="text-xs text-muted-foreground">
              Answers containing these keywords will be marked as correct
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

