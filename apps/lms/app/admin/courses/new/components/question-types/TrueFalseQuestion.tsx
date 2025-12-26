"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Trash2 } from "lucide-react"
import { TrueFalseQuestion as TFQuestionType } from "../types/quiz"
import FileUpload from "@/components/FileUpload"
import Image from "next/image"

interface TrueFalseQuestionProps {
  question: TFQuestionType
  onChange: (question: TFQuestionType) => void
  onDelete?: () => void
}

export default function TrueFalseQuestion({ question, onChange, onDelete }: TrueFalseQuestionProps) {
  const updateQuestion = (updates: Partial<TFQuestionType>) => {
    onChange({ ...question, ...updates })
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
              placeholder="Enter your true/false question..."
            />
          </div>

          <div className="space-y-2">
            <Label>Question Image (optional)</Label>
            {question.imageUrl && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border mb-2">
                <Image src={question.imageUrl} alt="Question image" fill className="object-contain" />
              </div>
            )}
            <FileUpload
              type="image"
              bucket="course-documents"
              accept="image/*"
              maxSize={5 * 1024 * 1024}
              multiple={false}
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
            <Label>Correct Answer</Label>
            <RadioGroup
              value={question.correctAnswer.toString()}
              onValueChange={(value) => updateQuestion({ correctAnswer: value === "true" })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer">False</Label>
              </div>
            </RadioGroup>
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

