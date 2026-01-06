import { useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"

interface UseAutoSaveOptions<T> {
  data: T
  courseId?: string | number
  enabled?: boolean
  interval?: number
  supabaseSyncInterval?: number // Interval for Supabase sync (default: 30 seconds)
  onSave?: (data: T) => void | Promise<void>
  onCourseIdChange?: (courseId: string | number) => void // Callback when courseId changes
}

export function useAutoSave<T>({
  data,
  courseId = "new",
  enabled = true,
  interval = 10000, // 10 seconds - localStorage save interval
  supabaseSyncInterval = 30000, // 30 seconds - Supabase sync interval
  onSave,
  onCourseIdChange,
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
    const previousCourseId = currentCourseIdRef.current
    currentCourseIdRef.current = courseId
    
    // If courseId changed from "new" to an actual ID, migrate localStorage
    if (previousCourseId === "new" && courseId !== "new" && courseId !== previousCourseId) {
      try {
        // Get the old draft data
        const oldDraftKey = `course-draft-${previousCourseId}`
        const oldDraftJson = localStorage.getItem(oldDraftKey)
        
        if (oldDraftJson) {
          const oldDraft = JSON.parse(oldDraftJson)
          // Save to new key
          const newDraftKey = `course-draft-${courseId}`
          const newDraftData = {
            ...oldDraft,
            courseId: courseId,
            savedAt: new Date().toISOString(),
          }
          localStorage.setItem(newDraftKey, JSON.stringify(newDraftData))
          // Remove old key
          localStorage.removeItem(oldDraftKey)
        }
      } catch (error) {
        console.error("Failed to migrate localStorage draft:", error)
      }
    }
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

  // Validate if course data has minimum required fields for Supabase save
  const isValidForSupabaseSave = useCallback((dataToSave: T): boolean => {
    // Type guard to check if data has basicInfo structure
    const courseData = dataToSave as any
    if (!courseData || !courseData.basicInfo) {
      return false
    }
    
    // For auto-save to Supabase, require at least a course title (same as "Save to Draft" requirement)
    const title = courseData.basicInfo?.title || ""
    return title.trim() !== ""
  }, [])

  // Sync to Supabase (persistent, periodic)
  const syncToSupabase = useCallback(
    async (dataToSave: T) => {
      // Only save to Supabase if course has at least a title (same validation as "Save to Draft")
      if (!isValidForSupabaseSave(dataToSave)) {
        console.log("Skipping Supabase sync: Course title is required")
        return
      }

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
          // Notify parent component of courseId change
          if (onCourseIdChange) {
            onCourseIdChange(result.courseId)
          }
        }

        return result
      } catch (error) {
        console.error("Failed to sync draft to Supabase:", error)
        // Don't throw - localStorage backup is still available
      }
    },
    [isValidForSupabaseSave]
  )

  // Combined save: localStorage immediately, Supabase only when explicitly forced
  const saveToStorage = useCallback(
    async (dataToSave: T, forceSupabaseSync = false) => {
      // Always save to localStorage first (fast)
      saveToLocalStorage(dataToSave)

      // Only sync to Supabase if explicitly forced (via Save to Draft or Publish button)
      // Do NOT sync automatically during auto-save to prevent duplicates
      if (forceSupabaseSync) {
        await syncToSupabase(dataToSave)
      }

      // Call optional onSave callback
      if (onSave) {
        await onSave(dataToSave)
      }
    },
    [saveToLocalStorage, syncToSupabase, onSave]
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
    // Transform flat database columns back to nested settings object
    return {
      basicInfo: {
        title: dbCourse.title || "",
        requirements: dbCourse.requirements || "",
        description: dbCourse.description || "",
        whoIsThisFor: dbCourse.who_is_this_for || "",
        thumbnail: dbCourse.image && dbCourse.image.trim() !== "" ? dbCourse.image.trim() : "", // Schema uses 'image', map back to 'thumbnail'
        previewVideo: dbCourse.preview_video && dbCourse.preview_video.trim() !== "" ? dbCourse.preview_video.trim() : "",
        price: dbCourse.price?.toString() || "",
      },
      lessons: (dbCourse.lessons || []).map((lesson: any) => {
        const content = lesson.content || {}
        const settings = {
          isRequired: lesson.is_required !== undefined ? lesson.is_required : true,
          videoProgression: lesson.video_progression !== undefined ? lesson.video_progression : false,
        }

        // Get all data from dedicated columns (NO JSONB content)
        const videoUrl = (lesson.video_url && lesson.video_url.trim() !== '') 
          ? lesson.video_url.trim() 
          : undefined

        const textContent = (lesson.text_content && lesson.text_content.trim() !== '')
          ? lesson.text_content.trim()
          : undefined

        const estimatedDuration = lesson.estimated_duration || 0

        // Build content object for frontend compatibility (but data comes from columns)
        const frontendContent: any = {}
        if (videoUrl) frontendContent.url = videoUrl
        if (textContent) {
          frontendContent.html = textContent
          frontendContent.text = textContent
        }

        // Ensure quiz questions preserve their database IDs
        const quizQuestions = (lesson.quiz?.questions || []).map((q: any) => {
          // Preserve the database ID if it exists (numeric string)
          // If it's a temporary ID (starts with "q-"), keep it as is
          const questionId = q.id?.toString() || `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          return {
            ...q,
            id: questionId, // Preserve database ID or use temporary ID
          }
        })

        return {
          id: lesson.id?.toString() || `lesson-${Date.now()}`,
          title: lesson.title || "",
          type: lesson.type || "text",
          content: frontendContent, // Built from dedicated columns, not JSONB
          // Resources and quiz come from normalized tables (via API)
          resources: lesson.resources || [],
          settings: settings,
          quiz: lesson.quiz ? {
            ...lesson.quiz,
            questions: quizQuestions,
          } : null, // Quiz settings from quiz_settings table
          estimatedDuration: estimatedDuration,
        }
      }),
      settings: {
        isPublished: dbCourse.is_published || false,
        requiresSequentialProgress: dbCourse.requires_sequential_progress !== undefined ? dbCourse.requires_sequential_progress : true,
        minimumQuizScore: dbCourse.minimum_quiz_score !== undefined ? dbCourse.minimum_quiz_score : 50,
        enrollment: {
          enrollmentMode: dbCourse.enrollment_mode || "free",
          price: dbCourse.price !== undefined ? dbCourse.price : undefined,
          recurringPrice: dbCourse.recurring_price !== undefined ? dbCourse.recurring_price : undefined,
        },
        certificate: {
          certificateEnabled: dbCourse.certificate_enabled || false,
          certificateTemplate: dbCourse.certificate_template || "",
          certificateTitle: dbCourse.certificate_title || "",
          certificateDescription: dbCourse.certificate_description || "",
          signatureImage: dbCourse.signature_image || "",
          signatureName: dbCourse.signature_name || "",
          signatureTitle: dbCourse.signature_title || "",
          additionalText: dbCourse.additional_text || "",
          certificateType: dbCourse.certificate_type || "completion",
        },
        prerequisites: dbCourse.prerequisites || { enabled: false, courseIds: [] },
        currency: dbCourse.currency || "USD",
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

