import { useState, useCallback } from "react"
import { Resource } from "../components/ResourceManager"

const STORAGE_KEY = "resource-library"

export interface ResourceLibraryItem extends Resource {
  savedAt: string
  usedInCourses?: string[]
}

export function useResourceLibrary() {
  const [resources, setResources] = useState<ResourceLibraryItem[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const saveResource = useCallback((resource: Resource, courseId?: string) => {
    const existingIndex = resources.findIndex((r) => r.url === resource.url && r.title === resource.title)
    
    if (existingIndex >= 0) {
      // Update existing resource
      const updated = [...resources]
      if (courseId && !updated[existingIndex].usedInCourses?.includes(courseId)) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          usedInCourses: [...(updated[existingIndex].usedInCourses || []), courseId],
        }
      }
      setResources(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated[existingIndex]
    } else {
      // Add new resource
      const libraryItem: ResourceLibraryItem = {
        ...resource,
        savedAt: new Date().toISOString(),
        usedInCourses: courseId ? [courseId] : [],
      }
      const updated = [...resources, libraryItem]
      setResources(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return libraryItem
    }
  }, [resources])

  const deleteResource = useCallback((id: string) => {
    const updated = resources.filter((r) => r.id !== id)
    setResources(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [resources])

  const getResources = useCallback((filters?: { category?: string; search?: string; type?: "document" | "link" }) => {
    let filtered = [...resources]
    
    if (filters?.category) {
      filtered = filtered.filter((r) => r.category === filters.category)
    }
    
    if (filters?.type) {
      filtered = filtered.filter((r) => r.type === filters.type)
    }
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter((r) => 
        r.title.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower) ||
        r.url.toLowerCase().includes(searchLower)
      )
    }
    
    return filtered
  }, [resources])

  const getCategories = useCallback(() => {
    const categories = new Set<string>()
    resources.forEach((r) => {
      if (r.category) categories.add(r.category)
    })
    return Array.from(categories).sort()
  }, [resources])

  return {
    resources,
    saveResource,
    deleteResource,
    getResources,
    getCategories,
  }
}

