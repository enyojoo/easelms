"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Brain, Plus, Trash2, Edit } from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { toast } from "sonner"

interface AIQuizGeneratorProps {
  lessonContent: string
  onQuizGenerated: (quiz: any) => void
}

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: "easy" | "medium" | "hard"
}

export default function AIQuizGenerator({ lessonContent, onQuizGenerated }: AIQuizGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([])
  const [quizSettings, setQuizSettings] = useState({
    questionCount: 5,
    difficulty: "medium" as "easy" | "medium" | "hard",
    questionTypes: ["multiple-choice", "true-false"],
    includeExplanations: true,
  })

  const generateQuiz = async () => {
    if (!lessonContent.trim()) {
      toast.error("Please provide lesson content to generate quiz questions")
      return
    }

    setIsGenerating(true)
    try {
      const prompt = `Based on the following lesson content, generate ${quizSettings.questionCount} quiz questions.

Lesson Content:
${lessonContent}

Requirements:
- Difficulty level: ${quizSettings.difficulty}
- Question types: ${quizSettings.questionTypes.join(", ")}
- Include explanations: ${quizSettings.includeExplanations}
- Each question should have 4 multiple choice options
- Mark the correct answer (0-3 index)
- Provide clear explanations for each answer

Format the response as a JSON array of questions with this structure:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 1,
    "explanation": "Explanation of why this answer is correct",
    "difficulty": "medium"
  }
]`

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
      })

      // Parse the AI response
      const questions = parseQuizResponse(text)
      setGeneratedQuestions(questions)
      toast.success(`Generated ${questions.length} quiz questions!`)
    } catch (error) {
      console.error("Error generating quiz:", error)
      toast.error("Failed to generate quiz questions. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const parseQuizResponse = (response: string): QuizQuestion[] => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0])
        return questions.map((q: any, index: number) => ({
          id: `question-${Date.now()}-${index}`,
          question: q.question || "",
          options: q.options || ["", "", "", ""],
          correctAnswer: q.correctAnswer || 0,
          explanation: q.explanation || "",
          difficulty: q.difficulty || "medium",
        }))
      }
    } catch (error) {
      console.error("Error parsing quiz response:", error)
    }

    // Fallback: return empty questions
    return []
  }

  const editQuestion = (questionId: string, field: string, value: any) => {
    setGeneratedQuestions(prev =>
      prev.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    )
  }

  const deleteQuestion = (questionId: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== questionId))
  }

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `question-${Date.now()}`,
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      difficulty: "medium",
    }
    setGeneratedQuestions(prev => [...prev, newQuestion])
  }

  const useQuiz = () => {
    if (generatedQuestions.length === 0) {
      toast.error("No questions to use")
      return
    }

    const quiz = {
      enabled: true,
      passingScore: 70,
      questions: generatedQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      })),
    }

    onQuizGenerated(quiz)
    toast.success("Quiz applied to lesson!")
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI Quiz Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quiz Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="questionCount">Number of Questions</Label>
            <Input
              id="questionCount"
              type="number"
              min="1"
              max="20"
              value={quizSettings.questionCount}
              onChange={(e) => setQuizSettings(prev => ({
                ...prev,
                questionCount: parseInt(e.target.value) || 5
              }))}
            />
          </div>
          <div>
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select
              value={quizSettings.difficulty}
              onValueChange={(value) => setQuizSettings(prev => ({
                ...prev,
                difficulty: value as "easy" | "medium" | "hard"
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={generateQuiz} disabled={isGenerating || !lessonContent.trim()}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Quiz
              </>
            )}
          </Button>
        </div>

        {/* Generated Questions */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Questions ({generatedQuestions.length})</h3>
              <div className="flex gap-2">
                <Button onClick={addQuestion} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
                <Button onClick={useQuiz} size="sm">
                  Use This Quiz
                </Button>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedQuestions.map((question, index) => (
                <Card key={question.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          Question {index + 1}
                        </Label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => editQuestion(question.id, "question", e.target.value)}
                          placeholder="Enter question..."
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.correctAnswer === optionIndex}
                            onChange={() => editQuestion(question.id, "correctAnswer", optionIndex)}
                            className="text-blue-600"
                          />
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...question.options]
                              newOptions[optionIndex] = e.target.value
                              editQuestion(question.id, "options", newOptions)
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                            className={question.correctAnswer === optionIndex ? "border-green-500" : ""}
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Explanation (Optional)</Label>
                      <Textarea
                        value={question.explanation}
                        onChange={(e) => editQuestion(question.id, "explanation", e.target.value)}
                        placeholder="Explain why this answer is correct..."
                        className="mt-1"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {question.difficulty}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Correct: Option {String.fromCharCode(65 + question.correctAnswer)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
