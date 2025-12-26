import { useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"

interface UseAutoSaveOptions<T> {
  data: T
  courseId?: string | number
  enabled?: boolean
  interval?: number
  supabaseSyncInterval?: number // Interval for Supabase sync (default: 30 seconds)
  onSave?: (data: T) => void | Promise<void>
}

export function useAutoSave<T>({
  data,
  courseId = "new",
  enabled = true,
  interval = 10000, // 10 seconds - localStorage save interval
  supabaseSyncInterval = 30000, // 30 seconds - Supabase sync interval
  onSave,
}: UseAutoSaveOptions<T>) {
  const lastSavedRef = useRef<Date | null>(null)
  const lastSupabaseSyncRef = useRef<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dataRef = useRef<T>(data)
  const isInitialMount = useRef(true)
  const currentCourseIdRef = useRef<string | number>(courseId)

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // Update courseId ref when it changes
  useEffect(() => {
    currentCourseIdRef.current = courseId
  }, [courseId])

  // Save to localStorage (fast, immediate)
  const saveToLocalStorage = useCallback(
    (dataToSave: T) => {
      try {
        const storageKey = `course-draft-${currentCourseIdRef.current}`
        const draftData = {
          data: dataToSave,
          savedAt: new Date().toISOString(),
        }
        localStorage.setItem(storageKey, JSON.stringify(draftData))
        lastSavedRef.current = new Date()
      } catch (error) {
        console.error("Failed to save draft to localStorage:", error)
      }
    },
    []
  )

  // Sync to Supabase (persistent, periodic)
  const syncToSupabase = useCallback(
    async (dataToSave: T) => {
      try {
        const response = await fetch("/api/courses/drafts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseId: currentCourseIdRef.current,
            courseData: dataToSave,
            isPublished: false, // Always save as draft for auto-save
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to sync draft to Supabase")
        }

        const result = await response.json()
        lastSupabaseSyncRef.current = new Date()
        
        // Update courseId if it was "new" and we got a real ID back
        if (currentCourseIdRef.current === "new" && result.courseId) {
          currentCourseIdRef.current = result.courseId
        }

        return result
      } catch (error) {
        console.error("Failed to sync draft to Supabase:", error)
        // Don't throw - localStorage backup is still available
      }
    },
    []
  )

  // Combined save: localStorage immediately, Supabase periodically
  const saveToStorage = useCallback(
    async (dataToSave: T, forceSupabaseSync = false) => {
      // Always save to localStorage first (fast)
      saveToLocalStorage(dataToSave)

      // Sync to Supabase if forced or if enough time has passed
      const now = new Date()
      const timeSinceLastSync = lastSupabaseSyncRef.current
        ? now.getTime() - lastSupabaseSyncRef.current.getTime()
        : Infinity

      if (forceSupabaseSync || timeSinceLastSync >= supabaseSyncInterval) {
        await syncToSupabase(dataToSave)
      }

      // Call optional onSave callback
      if (onSave) {
        await onSave(dataToSave)
      }
    },
    [saveToLocalStorage, syncToSupabase, supabaseSyncInterval, onSave]
  )

  const debouncedSave = useCallback(
    (dataToSave: T) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveToStorage(dataToSave, false)
      }, interval)
    },
    [interval, saveToStorage]
  )

  // Periodic Supabase sync (independent of localStorage saves)
  useEffect(() => {
    if (!enabled) return

    const syncInterval = setInterval(() => {
      if (dataRef.current) {
        syncToSupabase(dataRef.current)
      }
    }, supabaseSyncInterval)

    return () => {
      clearInterval(syncInterval)
    }
  }, [enabled, supabaseSyncInterval, syncToSupabase])

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

  // Transform database course format to course builder format
  const transformDbToCourseData = useCallback((dbCourse: any): any => {
    return {
      basicInfo: {
        title: dbCourse.title || "",
        requirements: dbCourse.requirements || "",
        description: dbCourse.description || "",
        whoIsThisFor: dbCourse.who_is_this_for || "",
        thumbnail: dbCourse.thumbnail || "",
        previewVideo: dbCourse.preview_video || "",
        price: dbCourse.price?.toString() || "",
      },
      lessons: (dbCourse.lessons || []).map((lesson: any) => ({
        id: lesson.id?.toString() || `lesson-${Date.now()}`,
        title: lesson.title || "",
        type: lesson.type || "text",
        content: lesson.content || {},
        resources: lesson.resources || [],
        settings: lesson.settings || {},
        quiz: lesson.quiz || null,
        estimatedDuration: lesson.estimated_duration || 0,
      })),
      settings: dbCourse.settings || {
        isPublished: dbCourse.is_published || false,
        requiresSequentialProgress: true,
        minimumQuizScore: 50,
        enrollment: {
          enrollmentMode: "free",
        },
        certificate: {
          certificateEnabled: false,
          certificateTemplate: "",
          certificateDescription: "",
          signatureImage: "",
          signatureTitle: "",
          additionalText: "",
          certificateType: "completion",
        },
        currency: "USD",
      },
    }
  }, [])

  const loadDraft = useCallback(async (): Promise<T | null> => {
    // First try to load from Supabase (if courseId is not "new")
    if (courseId && courseId !== "new") {
      try {
        const response = await fetch(`/api/courses/drafts?courseId=${courseId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.course) {
            // Transform database format back to course builder format
            const courseData = transformDbToCourseData(result.course)
            // Also save to localStorage as backup
            saveToLocalStorage(courseData as T)
            return courseData as T
          }
        }
      } catch (error) {
        console.error("Failed to load draft from Supabase:", error)
        // Fall through to localStorage
      }
    }

    // Fallback to localStorage
    try {
      const storageKey = `course-draft-${courseId}`
      const draftJson = localStorage.getItem(storageKey)
      if (!draftJson) return null

      const draft = JSON.parse(draftJson)
      return draft.data as T
    } catch (error) {
      console.error("Failed to load draft from localStorage:", error)
      return null
    }
  }, [courseId, saveToLocalStorage, transformDbToCourseData])

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
    await saveToStorage(dataRef.current, true) // Force Supabase sync
    toast.success("Draft saved", { duration: 2000 })
  }, [saveToStorage])

  return {
    lastSaved: lastSavedRef.current,
    loadDraft,
    clearDraft,
    saveNow,
  }
}

