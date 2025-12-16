import { useState, useCallback } from "react"

const STORAGE_KEY = "course-templates"

export interface CourseTemplate {
  id: string
  name: string
  description?: string
  category?: string
  courseData: any
  createdAt: string
  updatedAt: string
}

export function useCourseTemplates() {
  const [templates, setTemplates] = useState<CourseTemplate[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const saveTemplate = useCallback((name: string, courseData: any, description?: string, category?: string) => {
    const template: CourseTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      courseData: JSON.parse(JSON.stringify(courseData)), // Deep clone
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [...templates, template]
    setTemplates(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return template
  }, [templates])

  const updateTemplate = useCallback((id: string, updates: Partial<CourseTemplate>) => {
    const updated = templates.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    )
    setTemplates(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [templates])

  const deleteTemplate = useCallback((id: string) => {
    const updated = templates.filter((t) => t.id !== id)
    setTemplates(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [templates])

  const getTemplate = useCallback((id: string) => {
    return templates.find((t) => t.id === id)
  }, [templates])

  const getTemplates = useCallback((filters?: { category?: string; search?: string }) => {
    let filtered = [...templates]
    
    if (filters?.category) {
      filtered = filtered.filter((t) => t.category === filters.category)
    }
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter((t) => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      )
    }
    
    return filtered
  }, [templates])

  const getCategories = useCallback(() => {
    const categories = new Set<string>()
    templates.forEach((t) => {
      if (t.category) categories.add(t.category)
    })
    return Array.from(categories).sort()
  }, [templates])

  return {
    templates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getTemplates,
    getCategories,
  }
}

