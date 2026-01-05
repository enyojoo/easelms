"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Trash2, CheckCircle2, Image as ImageIcon } from "lucide-react"
import { MultipleChoiceQuestion as MCQType } from "../types/quiz"
import FileUpload from "@/components/FileUpload"
import SafeImage from "@/components/SafeImage"

interface MultipleChoiceQuestionProps {
  question: MCQType
  onChange: (question: MCQType) => void
  onDelete?: () => void
  courseId?: string | number
  lessonId?: string | number
}

export default function MultipleChoiceQuestion({ question, onChange, onDelete, courseId, lessonId }: MultipleChoiceQuestionProps) {
  const updateQuestion = (updates: Partial<MCQType>) => {
    onChange({ ...question, ...updates })
  }

  const addOption = () => {
    if (question.options.length < 6) {
      updateQuestion({
        options: [...question.options, ""],
      })
    }
  }

  const removeOption = (index: number) => {
    if (question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== index)
      const newCorrectOption =
        question.correctOption >= newOptions.length ? newOptions.length - 1 : question.correctOption
      updateQuestion({
        options: newOptions,
        correctOption: newCorrectOption,
      })
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...question.options]
    newOptions[index] = value
    updateQuestion({ options: newOptions })
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label>Question Text</Label>
            <Input
              value={question.text}
              onChange={(e) => updateQuestion({ text: e.target.value })}
              placeholder="Enter your question..."
            />
          </div>

          <div className="space-y-2">
            <Label>Question Image (optional)</Label>
            {question.imageUrl && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border mb-2">
                <SafeImage src={question.imageUrl} alt="Question image" fill className="object-contain" />
              </div>
            )}
            <FileUpload
              type="quiz"
              bucket="course-documents"
              accept="image/*"
              maxSize={5 * 1024 * 1024}
              multiple={false}
              courseId={courseId}
              lessonId={lessonId}
              fileId={question.id}
              initialValue={question.imageUrl || undefined}
              onUploadComplete={(files, urls) => {
                if (urls.length > 0) {
                  updateQuestion({ imageUrl: urls[0] })
                }
              }}
              onRemove={() => {
                updateQuestion({ imageUrl: undefined })
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Answer Options</Label>
            <RadioGroup
              value={question.correctOption.toString()}
              onValueChange={(value) => updateQuestion({ correctOption: Number.parseInt(value) })}
            >
              {question.options.map((option, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors ${
                    question.correctOption === index ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-grow"
                    />
                    {question.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
            {question.options.length < 6 && (
              <Button variant="outline" onClick={addOption} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Option
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Select the correct answer by clicking the radio button next to it
            </p>
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

