import { useState, useCallback } from "react"
import { Question } from "../types/quiz"

const STORAGE_KEY = "question-bank"

export interface QuestionBankItem extends Question {
  category?: string
  tags?: string[]
  savedAt: string
}

export function useQuestionBank() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const saveQuestion = useCallback((question: Question, category?: string, tags?: string[]) => {
    const bankItem: QuestionBankItem = {
      ...question,
      id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // New ID for bank
      category,
      tags,
      savedAt: new Date().toISOString(),
    }
    const updated = [...questions, bankItem]
    setQuestions(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return bankItem
  }, [questions])

  const deleteQuestion = useCallback((id: string) => {
    const updated = questions.filter((q) => q.id !== id)
    setQuestions(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [questions])

  const getQuestions = useCallback((filters?: { category?: string; tags?: string[]; search?: string }) => {
    let filtered = [...questions]
    
    if (filters?.category) {
      filtered = filtered.filter((q) => q.category === filters.category)
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      filtered = filtered.filter((q) => 
        q.tags?.some((tag) => filters.tags!.includes(tag))
      )
    }
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter((q) => 
        q.text.toLowerCase().includes(searchLower) ||
        q.type.toLowerCase().includes(searchLower)
      )
    }
    
    return filtered
  }, [questions])

  const getCategories = useCallback(() => {
    const categories = new Set<string>()
    questions.forEach((q) => {
      if (q.category) categories.add(q.category)
    })
    return Array.from(categories).sort()
  }, [questions])

  const getTags = useCallback(() => {
    const tags = new Set<string>()
    questions.forEach((q) => {
      q.tags?.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [questions])

  const importQuestions = useCallback((questionsToImport: Question[], category?: string) => {
    const bankItems: QuestionBankItem[] = questionsToImport.map((q) => ({
      ...q,
      id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      savedAt: new Date().toISOString(),
    }))
    const updated = [...questions, ...bankItems]
    setQuestions(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [questions])

  return {
    questions,
    saveQuestion,
    deleteQuestion,
    getQuestions,
    getCategories,
    getTags,
    importQuestions,
  }
}

