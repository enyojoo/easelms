"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
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

  // Auto-expand newly added questions and collapse others
  useEffect(() => {
    if (questions.length > 0) {
      const lastQuestion = questions[questions.length - 1]
      // If this is a new question (different ID), expand it and collapse others
      if (lastQuestion.id !== lastQuestionId) {
        setLastQuestionId(lastQuestion.id)
        setExpandedQuestions(new Set([lastQuestion.id]))
      }
    }
  }, [questions, lastQuestionId])

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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(questions)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    onChange({ ...quiz, questions: items })
  }

  const calculatePreviewScore = () => {
    if (!previewMode || questions.length === 0) return 0
    let correct = 0
    questions.forEach((question, qIndex) => {
      const answer = selectedAnswers[qIndex]
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
          // Essay and matching need manual grading
          break
      }
    })
    return Math.round((correct / questions.length) * 100)
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
        <Tabs defaultValue="builder" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="preview" disabled={questions.length === 0}>
                Preview
              </TabsTrigger>
            </TabsList>
            <Badge variant="outline" className="text-sm">
              {questions.length} {questions.length === 1 ? "question" : "questions"}
            </Badge>
          </div>

          <TabsContent value="builder" className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Passing Score</Label>
                <p className="text-xs text-muted-foreground">
                  Using course minimum: {minimumQuizScore}% (set in Course Settings)
                </p>
              </div>
            </div>

            <QuizSettings
              quiz={{
                enabled: quiz.enabled,
                questions: questions,
                shuffleQuestions: quiz.shuffleQuestions,
                shuffleAnswers: quiz.shuffleAnswers,
                showResultsImmediately: quiz.showResultsImmediately,
                allowMultipleAttempts: quiz.allowMultipleAttempts,
                showCorrectAnswers: quiz.showCorrectAnswers,
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
                                      {question.type.replace("-", " ")}
                                    </Badge>
                                    {question.points > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {question.points} {question.points === 1 ? "point" : "points"}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        {expandedQuestions.has(question.id) ? (
                                          <ChevronUp className="w-4 h-4" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </CollapsibleTrigger>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeQuestion(qIndex)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
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
              <div className="flex gap-2">
                <QuestionTypeSelector
                  onSelect={(type) => addQuestion(type)}
                  trigger={
                    <Button className="flex-1" variant="outline">
                      <Plus className="w-4 h-4 mr-2" /> Add Question
                    </Button>
                  }
                />
                <Button
                  onClick={() => addQuestion("multiple-choice")}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" /> Quick Add (MC)
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions.map((question, qIndex) => (
                  <div key={question.id} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">Question {qIndex + 1}</h3>
                      <Badge variant="secondary">{question.type}</Badge>
                    </div>
                    <p className="text-sm font-medium">{question.text || "No question text"}</p>
                    {/* Preview rendering would go here - simplified for now */}
                    <p className="text-xs text-muted-foreground">
                      Preview mode for {question.type} questions - full implementation in next phase
                    </p>
                  </div>
                ))}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Your Score</span>
                    <span className="text-2xl font-bold text-primary">{calculatePreviewScore()}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Passing score: {minimumQuizScore}% -{" "}
                    {calculatePreviewScore() >= minimumQuizScore ? (
                      <span className="text-green-600 font-semibold">Passed!</span>
                    ) : (
                      <span className="text-red-600 font-semibold">Not passed</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
