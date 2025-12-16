"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2 } from "lucide-react"
import { EssayQuestion as EssayQuestionType } from "../types/quiz"

interface EssayQuestionProps {
  question: EssayQuestionType
  onChange: (question: EssayQuestionType) => void
  onDelete?: () => void
}

export default function EssayQuestion({ question, onChange, onDelete }: EssayQuestionProps) {
  const updateQuestion = (updates: Partial<EssayQuestionType>) => {
    onChange({ ...question, ...updates })
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
              placeholder="Enter your essay question..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Word Limit (optional)</Label>
            <Input
              type="number"
              min="0"
              value={question.wordLimit || ""}
              onChange={(e) => updateQuestion({ wordLimit: Number.parseInt(e.target.value) || undefined })}
              placeholder="No limit"
            />
            <p className="text-xs text-muted-foreground">
              Set a maximum word count for student responses
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Points</Label>
              <p className="text-sm text-muted-foreground">Maximum points for this question</p>
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

