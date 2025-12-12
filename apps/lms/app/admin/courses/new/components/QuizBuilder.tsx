"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Trash2 } from "lucide-react"

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Quiz</Label>
          <p className="text-sm text-muted-foreground">Add a quiz to your course</p>
        </div>
        <Switch checked={quiz.enabled} onCheckedChange={toggleQuiz} />
      </div>

      {quiz.enabled && (
        <>
          <div className="space-y-2">
            <Label>Passing Score (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={quiz.passingScore}
              onChange={(e) => onChange({ ...quiz, passingScore: Number.parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-4">
            {quiz.questions.map((question, qIndex) => (
              <div key={question.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-grow space-y-2">
                    <Label>Question {qIndex + 1}</Label>
                    <Input
                      value={question.text}
                      onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                      placeholder="Enter question text"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Options</Label>
                  <RadioGroup
                    value={question.correctOption.toString()}
                    onValueChange={(value) => updateQuestion(qIndex, { correctOption: Number.parseInt(value) })}
                  >
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
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
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={addQuestion}>
            <Plus className="w-4 h-4 mr-2" /> Add Question
          </Button>
        </>
      )}
    </div>
  )
}
