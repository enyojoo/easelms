"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy } from "lucide-react"
import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Quiz, Question } from "../types/quiz"
import QuestionEditor, { createQuestion } from "./question-types/QuestionEditor"
import QuestionTypeSelector from "./question-types/QuestionTypeSelector"
import QuizSettings from "./QuizSettings"

interface QuizBuilderProps {
  quiz: {
    enabled: boolean
    questions: any[]
  }
  onChange: (quiz: any) => void
  minimumQuizScore?: number
}

export default function QuizBuilder({ quiz, onChange, minimumQuizScore = 50 }: QuizBuilderProps) {
  const [previewMode, setPreviewMode] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({})
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  // Migrate old questions to new format if needed
  const migrateQuestions = (questions: any[]): Question[] => {
    return questions.map((q) => {
      // If already in new format, return as is
      if (q.type) {
        return q as Question
      }
      // Migrate old multiple choice format
      return {
        id: q.id || `q-${Date.now()}`,
        type: "multiple-choice",
        text: q.text || "",
        options: q.options || ["", "", "", ""],
        correctOption: q.correctOption || 0,
        points: 1,
        explanation: "",
      } as Question
    })
  }

  const questions: Question[] = migrateQuestions(quiz.questions || [])

  // Track the last question ID to auto-expand new questions
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Auto-expand newly added questions and collapse others
  useEffect(() => {
    if (!isInitialized && questions.length > 0) {
      // On initial load, keep all questions collapsed
      setIsInitialized(true)
      setLastQuestionId(questions[questions.length - 1].id)
      return
    }

    if (questions.length > 0 && isInitialized) {
      const lastQuestion = questions[questions.length - 1]
      // If this is a new question (different ID), expand it and collapse others
      if (lastQuestion.id !== lastQuestionId) {
        setLastQuestionId(lastQuestion.id)
        setExpandedQuestions(new Set([lastQuestion.id]))
      }
    }
  }, [questions, lastQuestionId, isInitialized])

  const toggleQuiz = (enabled: boolean) => {
    onChange({ ...quiz, enabled })
  }

  const addQuestion = (type?: string) => {
    const questionType = (type || "multiple-choice") as any
    const newQuestion = createQuestion(questionType)
    // Collapse all previous questions - useEffect will auto-expand the new one
    setExpandedQuestions(new Set())
    onChange({
      ...quiz,
      questions: [...questions, newQuestion],
    })
  }

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  const updateQuestion = (index: number, updatedQuestion: Question) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = updatedQuestion
    onChange({ ...quiz, questions: updatedQuestions })
  }

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index)
    onChange({ ...quiz, questions: updatedQuestions })
  }

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = questions[index]
    const duplicatedQuestion = {
      ...questionToDuplicate,
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
    const updatedQuestions = [...questions]
    updatedQuestions.splice(index + 1, 0, duplicatedQuestion)
    onChange({ ...quiz, questions: updatedQuestions })
    // Expand the duplicated question
    setExpandedQuestions(new Set([...expandedQuestions, duplicatedQuestion.id]))
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(questions)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    onChange({ ...quiz, questions: items })
  }

  const formatQuestionType = (type: string): string => {
    if (type === "essay") return "long question"
    return type.replace("-", " ")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base font-semibold">Quiz Settings</Label>
          <p className="text-sm text-muted-foreground">Add a quiz to test student knowledge</p>
        </div>
        <Switch checked={quiz.enabled} onCheckedChange={toggleQuiz} />
      </div>

      {quiz.enabled && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-sm">
              {questions.length} {questions.length === 1 ? "question" : "questions"}
            </Badge>
          </div>

          <div className="space-y-4">
            <QuizSettings
              quiz={{
                enabled: quiz.enabled,
                questions: questions,
                showResultsImmediately: (quiz as any).showResultsImmediately,
                allowMultipleAttempts: (quiz as any).allowMultipleAttempts,
                maxAttempts: (quiz as any).maxAttempts,
                showCorrectAnswers: (quiz as any).showCorrectAnswers,
              }}
              onChange={(updatedQuiz) => {
                onChange({
                  ...quiz,
                  ...updatedQuiz,
                  questions: questions, // Keep existing questions
                })
              }}
            />

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {questions.map((question, qIndex) => (
                      <Draggable key={question.id} draggableId={question.id} index={qIndex}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="border-2"
                          >
                            <Collapsible
                              open={expandedQuestions.has(question.id)}
                              onOpenChange={() => toggleQuestion(question.id)}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                    </div>
                                    <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                                    <Badge variant="secondary" className="text-xs">
                                      {formatQuestionType(question.type)}
                                    </Badge>
                                    {question.points > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {question.points} {question.points === 1 ? "point" : "points"}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => duplicateQuestion(qIndex)}
                                      title="Duplicate"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeQuestion(qIndex)}
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        {expandedQuestions.has(question.id) ? (
                                          <ChevronUp className="w-4 h-4" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </CollapsibleTrigger>
                                  </div>
                                </div>
                              </CardHeader>
                              <CollapsibleContent>
                                <CardContent>
                                  <QuestionEditor
                                    question={question}
                                    onChange={(updated) => updateQuestion(qIndex, updated)}
                                  />
                                </CardContent>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div className="space-y-2">
              <QuestionTypeSelector
                onSelect={(type) => addQuestion(type)}
                trigger={
                  <Button className="w-full" variant="outline">
                    <Plus className="w-4 h-4 mr-2" /> Add Question
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
