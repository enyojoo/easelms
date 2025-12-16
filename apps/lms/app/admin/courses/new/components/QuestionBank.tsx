"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Database } from "lucide-react"
import QuestionBankModal from "./QuestionBankModal"
import { Question } from "../types/quiz"
import { useQuestionBank } from "../hooks/useQuestionBank"

interface QuestionBankProps {
  onSelect: (question: Question) => void
  onSave?: (question: Question) => void
  currentQuestion?: Question
}

export default function QuestionBank({ onSelect, onSave, currentQuestion }: QuestionBankProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { saveQuestion } = useQuestionBank()

  const handleSave = (question: Question, category?: string, tags?: string[]) => {
    if (onSave) {
      onSave(question)
    } else {
      saveQuestion(question, category, tags)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          <Database className="w-4 h-4 mr-2" /> Browse Question Bank
        </Button>
        {currentQuestion && (
          <Button
            variant="outline"
            onClick={() => handleSave(currentQuestion)}
          >
            Save to Bank
          </Button>
        )}
      </div>

      <QuestionBankModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={onSelect}
        onSave={currentQuestion ? handleSave : undefined}
      />
    </>
  )
}

