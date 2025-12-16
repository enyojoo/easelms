import { useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"

interface UseAutoSaveOptions<T> {
  data: T
  courseId?: string | number
  enabled?: boolean
  interval?: number
  onSave?: (data: T) => void | Promise<void>
}

export function useAutoSave<T>({
  data,
  courseId = "new",
  enabled = true,
  interval = 30000, // 30 seconds
  onSave,
}: UseAutoSaveOptions<T>) {
  const lastSavedRef = useRef<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dataRef = useRef<T>(data)
  const isInitialMount = useRef(true)

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const saveToStorage = useCallback(
    async (dataToSave: T) => {
      try {
        const storageKey = `course-draft-${courseId}`
        const draftData = {
          data: dataToSave,
          savedAt: new Date().toISOString(),
        }
        localStorage.setItem(storageKey, JSON.stringify(draftData))
        lastSavedRef.current = new Date()

        // Call optional onSave callback
        if (onSave) {
          await onSave(dataToSave)
        }
      } catch (error) {
        console.error("Failed to save draft:", error)
      }
    },
    [courseId, onSave]
  )

  const debouncedSave = useCallback(
    (dataToSave: T) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveToStorage(dataToSave)
      }, interval)
    },
    [interval, saveToStorage]
  )

  // Auto-save effect
  useEffect(() => {
    if (!enabled) return
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    debouncedSave(dataRef.current)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [data, enabled, debouncedSave])

  // Save immediately on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (enabled && dataRef.current) {
        saveToStorage(dataRef.current)
      }
    }
  }, [enabled, saveToStorage])

  const loadDraft = useCallback((): T | null => {
    try {
      const storageKey = `course-draft-${courseId}`
      const draftJson = localStorage.getItem(storageKey)
      if (!draftJson) return null

      const draft = JSON.parse(draftJson)
      return draft.data as T
    } catch (error) {
      console.error("Failed to load draft:", error)
      return null
    }
  }, [courseId])

  const clearDraft = useCallback(() => {
    try {
      const storageKey = `course-draft-${courseId}`
      localStorage.removeItem(storageKey)
      lastSavedRef.current = null
    } catch (error) {
      console.error("Failed to clear draft:", error)
    }
  }, [courseId])

  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveToStorage(dataRef.current)
    toast.success("Draft saved", { duration: 2000 })
  }, [saveToStorage])

  return {
    lastSaved: lastSavedRef.current,
    loadDraft,
    clearDraft,
    saveNow,
  }
}

