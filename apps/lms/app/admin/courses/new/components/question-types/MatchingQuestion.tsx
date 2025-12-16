"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, X } from "lucide-react"
import { MatchingQuestion as MatchingQuestionType } from "../types/quiz"

interface MatchingQuestionProps {
  question: MatchingQuestionType
  onChange: (question: MatchingQuestionType) => void
  onDelete?: () => void
}

export default function MatchingQuestion({ question, onChange, onDelete }: MatchingQuestionProps) {
  const updateQuestion = (updates: Partial<MatchingQuestionType>) => {
    onChange({ ...question, ...updates })
  }

  const addLeftItem = () => {
    updateQuestion({
      leftItems: [...question.leftItems, ""],
    })
  }

  const removeLeftItem = (index: number) => {
    if (question.leftItems.length > 1) {
      const newLeftItems = question.leftItems.filter((_, i) => i !== index)
      const newMatches = question.correctMatches.filter((m) => m.leftIndex !== index)
      updateQuestion({
        leftItems: newLeftItems,
        correctMatches: newMatches,
      })
    }
  }

  const updateLeftItem = (index: number, value: string) => {
    const newItems = [...question.leftItems]
    newItems[index] = value
    updateQuestion({ leftItems: newItems })
  }

  const addRightItem = () => {
    updateQuestion({
      rightItems: [...question.rightItems, ""],
    })
  }

  const removeRightItem = (index: number) => {
    if (question.rightItems.length > 1) {
      const newRightItems = question.rightItems.filter((_, i) => i !== index)
      const newMatches = question.correctMatches.filter((m) => m.rightIndex !== index)
      updateQuestion({
        rightItems: newRightItems,
        correctMatches: newMatches,
      })
    }
  }

  const updateRightItem = (index: number, value: string) => {
    const newItems = [...question.rightItems]
    newItems[index] = value
    updateQuestion({ rightItems: newItems })
  }

  const setMatch = (leftIndex: number, rightIndex: number) => {
    const existingMatch = question.correctMatches.find((m) => m.leftIndex === leftIndex)
    const newMatches = existingMatch
      ? question.correctMatches.map((m) => (m.leftIndex === leftIndex ? { leftIndex, rightIndex } : m))
      : [...question.correctMatches, { leftIndex, rightIndex }]
    updateQuestion({ correctMatches: newMatches })
  }

  const getMatchForLeft = (leftIndex: number) => {
    const match = question.correctMatches.find((m) => m.leftIndex === leftIndex)
    return match ? match.rightIndex : -1
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label>Question Instructions</Label>
            <Input
              value={question.text}
              onChange={(e) => updateQuestion({ text: e.target.value })}
              placeholder="Enter matching instructions..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Left Column Items</Label>
              <div className="space-y-2">
                {question.leftItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateLeftItem(index, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                      className="flex-1"
                    />
                    {question.leftItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLeftItem(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={addLeftItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Right Column Items</Label>
              <div className="space-y-2">
                {question.rightItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateRightItem(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {question.rightItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRightItem(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={addRightItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Option
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Correct Matches</Label>
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              {question.leftItems.map((leftItem, leftIndex) => {
                if (!leftItem) return null
                const matchedRight = getMatchForLeft(leftIndex)
                return (
                  <div key={leftIndex} className="flex items-center gap-2">
                    <span className="text-sm font-medium flex-1">{leftItem}</span>
                    <span className="text-muted-foreground">→</span>
                    <select
                      value={matchedRight}
                      onChange={(e) => setMatch(leftIndex, Number.parseInt(e.target.value))}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="-1">Select match...</option>
                      {question.rightItems.map((rightItem, rightIndex) => (
                        <option key={rightIndex} value={rightIndex}>
                          {rightItem || `Option ${rightIndex + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
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

