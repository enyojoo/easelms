"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CheckCircle2, Type, FileText } from "lucide-react"
import { QuestionType } from "../types/quiz"

interface QuestionTypeOption {
  type: QuestionType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const questionTypes: QuestionTypeOption[] = [
  {
    type: "multiple-choice",
    label: "Multiple Choice",
    description: "Students select one or more correct answers from a list of options",
    icon: CheckCircle2,
  },
  {
    type: "fill-blank",
    label: "Fill in the Blank",
    description: "Students type the missing word or phrase",
    icon: Type,
  },
  {
    type: "short-answer",
    label: "Short Answer",
    description: "Students provide a brief answer, auto-graded by keywords",
    icon: FileText,
  },
  {
    type: "essay",
    label: "Longer Answer",
    description: "Students write a longer response, requires manual grading",
    icon: FileText,
  },
]

interface QuestionTypeSelectorProps {
  onSelect: (type: QuestionType) => void
  trigger?: React.ReactNode
}

export default function QuestionTypeSelector({ onSelect, trigger }: QuestionTypeSelectorProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (type: QuestionType) => {
    onSelect(type)
    setOpen(false) // Close dialog when a question type is selected
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <HelpCircle className="w-4 h-4 mr-2" />
            Select Question Type
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Question Type</DialogTitle>
          <DialogDescription>Choose the type of question you want to add to your quiz</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {questionTypes.map((option) => {
            const Icon = option.icon
            return (
              <Button
                key={option.type}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-primary/5 transition-colors"
                onClick={() => handleSelect(option.type)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-semibold text-left">{option.label}</span>
                </div>
                <p className="text-sm text-muted-foreground text-left w-full leading-relaxed">
                  {option.description}
                </p>
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

