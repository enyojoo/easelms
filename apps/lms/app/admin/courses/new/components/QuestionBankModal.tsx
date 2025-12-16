"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, X, Plus, Download, Upload } from "lucide-react"
import { useQuestionBank, QuestionBankItem } from "../hooks/useQuestionBank"
import { Question } from "../types/quiz"
import { createQuestion } from "./question-types/QuestionEditor"

interface QuestionBankModalProps {
  open: boolean
  onClose: () => void
  onSelect: (question: Question) => void
  onSave?: (question: Question, category?: string, tags?: string[]) => void
}

export default function QuestionBankModal({ open, onClose, onSelect, onSave }: QuestionBankModalProps) {
  const { questions, saveQuestion, deleteQuestion, getQuestions, getCategories, getTags } = useQuestionBank()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [newTag, setNewTag] = useState("")

  const categories = getCategories()
  const tags = getTags()

  const filteredQuestions = useMemo(() => {
    return getQuestions({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      search: search || undefined,
    })
  }, [questions, selectedCategory, selectedTags, search, getQuestions])

  const handleSelect = (question: QuestionBankItem) => {
    // Create a new question instance from the bank item
    const newQuestion = createQuestion(question.type, question.id)
    Object.assign(newQuestion, {
      ...question,
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // New ID
    })
    onSelect(newQuestion)
    onClose()
  }

  const handleSave = (question: Question) => {
    if (onSave) {
      onSave(question, newCategory || undefined, newTag ? [newTag] : undefined)
    } else {
      saveQuestion(question, newCategory || undefined, newTag ? [newTag] : undefined)
    }
    setNewCategory("")
    setNewTag("")
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Question Bank</DialogTitle>
          <DialogDescription>
            Browse and reuse questions from your question bank
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filters */}
          <div className="space-y-3 border-b pb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Question List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No questions found</p>
                <p className="text-sm mt-1">Try adjusting your filters or add questions to the bank</p>
              </div>
            ) : (
              filteredQuestions.map((question) => (
                <Card key={question.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSelect(question)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{question.type}</Badge>
                          {question.category && (
                            <Badge variant="outline">{question.category}</Badge>
                          )}
                          {question.difficulty && (
                            <Badge variant="outline">{question.difficulty}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium line-clamp-2">{question.text}</p>
                        {question.tags && question.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {question.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteQuestion(question.id)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Save Section */}
          {onSave && (
            <div className="border-t pt-4 space-y-2">
              <Label>Save Current Question to Bank</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Category (optional)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Input
                  placeholder="Tag (optional)"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

