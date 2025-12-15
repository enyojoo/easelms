"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Eye, GripVertical, CheckCircle2 } from "lucide-react"
import { useState } from "react"

interface Question {
  id: string
  text: string
  options: string[]
  correctOption: number
}

interface QuizBuilderProps {
  quiz: {
    enabled: boolean
    questions: Question[]
    passingScore: number
  }
  onChange: (quiz: any) => void
}

export default function QuizBuilder({ quiz, onChange }: QuizBuilderProps) {
  const [previewMode, setPreviewMode] = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})

  const toggleQuiz = (enabled: boolean) => {
    onChange({ ...quiz, enabled })
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: "",
      options: ["", "", "", ""],
      correctOption: 0,
    }
    onChange({
      ...quiz,
      questions: [...quiz.questions, newQuestion],
    })
  }

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updatedQuestions = [...quiz.questions]
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates }
    onChange({ ...quiz, questions: updatedQuestions })
  }

  const removeQuestion = (index: number) => {
    const updatedQuestions = [...quiz.questions]
    updatedQuestions.splice(index, 1)
    onChange({ ...quiz, questions: updatedQuestions })
  }

  const calculatePreviewScore = () => {
    if (!previewMode) return 0
    let correct = 0
    quiz.questions.forEach((question, qIndex) => {
      if (selectedAnswers[qIndex] === question.correctOption) {
        correct++
      }
    })
    return Math.round((correct / quiz.questions.length) * 100)
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
              <TabsTrigger value="preview" disabled={quiz.questions.length === 0}>
                Preview
              </TabsTrigger>
            </TabsList>
            <Badge variant="outline" className="text-sm">
              {quiz.questions.length} {quiz.questions.length === 1 ? "question" : "questions"}
            </Badge>
          </div>

          <TabsContent value="builder" className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Passing Score</Label>
                <p className="text-xs text-muted-foreground">Minimum score required to pass</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={quiz.passingScore}
                  onChange={(e) => onChange({ ...quiz, passingScore: Number.parseInt(e.target.value) || 0 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-4">
              {quiz.questions.map((question, qIndex) => (
                <Card key={question.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                        {question.text && (
                          <Badge variant="secondary" className="text-xs">
                            {question.options.filter((o) => o.trim()).length} options
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Text</Label>
                      <Input
                        value={question.text}
                        onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                        placeholder="Enter your question here..."
                        className="font-medium"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Answer Options</Label>
                      <RadioGroup
                        value={question.correctOption.toString()}
                        onValueChange={(value) => updateQuestion(qIndex, { correctOption: Number.parseInt(value) })}
                      >
                        {question.options.map((option, oIndex) => (
                          <div
                            key={oIndex}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors ${
                              question.correctOption === oIndex
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...question.options]
                                  newOptions[oIndex] = e.target.value
                                  updateQuestion(qIndex, { options: newOptions })
                                }}
                                placeholder={`Option ${oIndex + 1}`}
                                className="flex-grow"
                              />
                              {question.correctOption === oIndex && (
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                      <p className="text-xs text-muted-foreground">
                        Select the correct answer by clicking the radio button next to it
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button onClick={addQuestion} className="w-full" variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {quiz.questions.map((question, qIndex) => (
                  <div key={question.id} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">Question {qIndex + 1}</h3>
                      {selectedAnswers[qIndex] === question.correctOption && (
                        <Badge variant="default" className="bg-green-500">
                          Correct
                        </Badge>
                      )}
                      {selectedAnswers[qIndex] !== undefined &&
                        selectedAnswers[qIndex] !== question.correctOption && (
                          <Badge variant="destructive">Incorrect</Badge>
                        )}
                    </div>
                    <p className="text-sm font-medium">{question.text || "No question text"}</p>
                    <RadioGroup
                      value={selectedAnswers[qIndex]?.toString()}
                      onValueChange={(value) =>
                        setSelectedAnswers({ ...selectedAnswers, [qIndex]: Number.parseInt(value) })
                      }
                    >
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                          <RadioGroupItem value={oIndex.toString()} id={`preview-q${qIndex}-o${oIndex}`} />
                          <Label htmlFor={`preview-q${qIndex}-o${oIndex}`} className="flex-1 cursor-pointer">
                            {option || `Option ${oIndex + 1}`}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Your Score</span>
                    <span className="text-2xl font-bold text-primary">{calculatePreviewScore()}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Passing score: {quiz.passingScore}% -{" "}
                    {calculatePreviewScore() >= quiz.passingScore ? (
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
