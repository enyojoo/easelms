"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import CourseBasicInfo from "./components/CourseBasicInfo"
import LessonBuilder from "./components/LessonBuilder"
import CourseSettings from "./components/CourseSettings"
import CoursePreview from "./components/CoursePreview"
import { useAutoSave } from "./hooks/useAutoSave"
import { useInvalidateCourses } from "@/lib/react-query/hooks"

function NewCourseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [courseData, setCourseData] = useState<{
    basicInfo: {
      title: string
      requirements: string
      description: string
      whoIsThisFor: string
      thumbnail: string
      previewVideo: string
      price: string
    }
    lessons: any[]
    settings: {
      isPublished: boolean
      requiresSequentialProgress: boolean
      minimumQuizScore: number
      enrollment: {
        enrollmentMode: "free" | "buy"
        price?: number
      }
      certificate: {
        certificateEnabled: boolean
        certificateTemplate: string
        certificateDescription: string
        signatureImage: string
        signatureName: string
        signatureTitle: string
        additionalText: string
        certificateType: "completion" | "participation" | "achievement"
      }
      prerequisites?: {
        enabled: boolean
        courseIds: number[]
      }
      instructor?: {
        instructorEnabled: boolean
        instructorIds: string[]
      }
    }
  }>({
    basicInfo: {
      title: "",
      requirements: "",
      description: "",
      whoIsThisFor: "",
      thumbnail: "",
      previewVideo: "",
      price: "",
    },
    lessons: [],
    settings: {
      isPublished: false,
      requiresSequentialProgress: true,
      minimumQuizScore: 50,
      enrollment: {
        enrollmentMode: "free",
        price: undefined,
      },
      certificate: {
        certificateEnabled: false,
        certificateTemplate: "",
        certificateDescription: "",
        signatureImage: "",
        signatureName: "",
        signatureTitle: "",
        additionalText: "",
        certificateType: "completion",
      },
      prerequisites: {
        enabled: false,
        courseIds: [],
      },
      instructor: {
        instructorEnabled: false,
        instructorIds: [],
      },
    },
  })

  const editCourseId = searchParams?.get("edit")
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(editCourseId || null)
  
  // Auto-save hook - saves silently to localStorage in the background
  // IMPORTANT: Auto-save only saves to localStorage (every 10 seconds)
  // Database saves only happen via explicit Draft/Publish button clicks
  // This prevents file uploads (videos, thumbnails, etc.) from being overwritten
  const { clearDraft, loadDraft } = useAutoSave({
    data: courseData,
    courseId: currentCourseId || editCourseId || "new",
    enabled: true,
    onCourseIdChange: (newCourseId) => {
      // Update URL when courseId changes from "new" to actual ID
      if (newCourseId && newCourseId !== "new") {
        setCurrentCourseId(newCourseId.toString())
        router.replace(`/admin/courses/new?edit=${newCourseId}`)
      }
    },
  })
  
  // Get cache invalidation function for courses
  const invalidateCourses = useInvalidateCourses()
  
  const [loading, setLoading] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [instructors, setInstructors] = useState<Array<{
    id: string
    name: string
    image?: string | null
    bio?: string | null
  }>>([])
  const [instructorsLoading, setInstructorsLoading] = useState(false)
  
  // Use ref to track latest courseData to ensure draft/publish use current builder state
  // CRITICAL: This ref must always be in sync with courseData state to preserve file uploads
  const courseDataRef = useRef(courseData)
  useEffect(() => {
    // Always keep ref in sync with state - this ensures file URLs are never lost
    courseDataRef.current = courseData
  }, [courseData])

  // Update currentCourseId when editCourseId changes
  useEffect(() => {
    if (editCourseId) {
      setCurrentCourseId(editCourseId)
    } else {
      setCurrentCourseId(null)
    }
  }, [editCourseId])

  // Fetch instructors once when instructor settings are enabled
  useEffect(() => {
    const fetchInstructors = async () => {
      if (!courseData.settings.instructor?.instructorEnabled) {
        return
      }

      // Only fetch if we don't already have instructors
      if (instructors.length > 0) {
        return
      }

      try {
        setInstructorsLoading(true)
        const response = await fetch("/api/instructors")
        if (!response.ok) {
          throw new Error("Failed to fetch instructors")
        }
        const data = await response.json()
        setInstructors(data.instructors || [])
      } catch (error: any) {
        console.error("Error fetching instructors:", error)
      } finally {
        setInstructorsLoading(false)
      }
    }

    fetchInstructors()
  }, [courseData.settings.instructor?.instructorEnabled, instructors.length])

  // Load course data on mount
  useEffect(() => {
    const loadCourseData = async () => {
      if (editCourseId) {
        // Fetch course from API when editing
        setLoading(true)
        console.log("Loading course with ID:", editCourseId)
        try {
          const response = await fetch(`/api/courses/drafts?courseId=${editCourseId}`)
          console.log("Response status:", response.status, response.statusText)
          if (response.ok) {
            const result = await response.json()
            console.log("Drafts API Response:", {
              hasCourse: !!result.course,
              courseId: result.course?.id,
              lessonsCount: result.course?.lessons?.length || 0,
              lessonIds: result.course?.lessons?.map((l: any) => l.id) || [],
              lessonTitles: result.course?.lessons?.map((l: any) => l.title) || [],
            })
            if (result.course) {
              // Transform database format to course builder format
              const course = result.course
              console.log("Setting course data with lessons:", {
                lessonsCount: course.lessons?.length || 0,
                lessons: course.lessons,
                firstLesson: course.lessons?.[0],
              })
              setCourseData({
                basicInfo: {
                  title: course.title || "",
                  requirements: course.requirements || "",
                  description: course.description || "",
                  whoIsThisFor: course.who_is_this_for || "",
                  thumbnail: (course.image && course.image.trim() !== "") ? course.image.trim() : (course.thumbnail && course.thumbnail.trim() !== "" ? course.thumbnail.trim() : ""), // Schema uses 'image', map to 'thumbnail'
                  previewVideo: (course.preview_video && course.preview_video.trim() !== "") ? course.preview_video.trim() : "",
                  price: course.price?.toString() || "",
                },
                lessons: (course.lessons || []).map((lesson: any) => {
                  // The API already transforms lessons to frontend format, but we need to ensure
                  // the structure matches exactly what the lesson builder expects
                  
                  // Check if lesson is already in frontend format (has content object)
                  // or if it's still in database format (has video_url, text_content columns)
                  const isAlreadyTransformed = lesson.content && typeof lesson.content === 'object'
                  
                  let frontendContent: any = {}
                  let settings: any = {}
                  let estimatedDuration = 0
                  
                  if (isAlreadyTransformed) {
                    // Lesson is already transformed by API - use it directly
                    frontendContent = lesson.content || {}
                    settings = lesson.settings || {
                      isRequired: lesson.is_required !== undefined ? lesson.is_required : true,
                    }
                    estimatedDuration = lesson.estimatedDuration || lesson.estimated_duration || 0
                  } else {
                    // Lesson is in database format - transform it
                    settings = {
                      isRequired: lesson.is_required !== undefined ? lesson.is_required : true,
                    }
                    
                    const videoUrl = (lesson.video_url && lesson.video_url.trim() !== '') 
                      ? lesson.video_url.trim() 
                      : undefined
                    
                    const textContent = (lesson.text_content && lesson.text_content.trim() !== '')
                      ? lesson.text_content.trim()
                      : undefined
                    
                    estimatedDuration = lesson.estimated_duration || 0
                    
                    if (videoUrl) frontendContent.url = videoUrl
                    if (textContent) {
                      frontendContent.html = textContent
                      frontendContent.text = textContent
                    }
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

                  // Build the lesson object in the format expected by the lesson builder
                  const transformedLesson = {
                    id: lesson.id?.toString() || `lesson-${Date.now()}`,
                    title: lesson.title || "",
                    type: lesson.type || "text",
                    content: frontendContent,
                    resources: lesson.resources || [],
                    settings: settings,
                    quiz: lesson.quiz ? {
                      enabled: lesson.quiz.enabled ?? false,
                      questions: quizQuestions,
                      showCorrectAnswers: lesson.quiz.showCorrectAnswers ?? false,
                      allowMultipleAttempts: lesson.quiz.allowMultipleAttempts ?? false,
                      maxAttempts: lesson.quiz.maxAttempts ?? 3,
                      shuffleQuiz: lesson.quiz.shuffleQuiz ?? false,
                      timeLimit: lesson.quiz.timeLimit || null,
                      passingScore: lesson.quiz.passingScore || null,
                    } : {
                      enabled: false,
                      questions: [],
                      showCorrectAnswers: false,
                      allowMultipleAttempts: false,
                      maxAttempts: 3,
                      shuffleQuiz: false,
                      timeLimit: null,
                      passingScore: null,
                    },
                    estimatedDuration: estimatedDuration,
                  }
                  
                  console.log("Transformed lesson:", {
                    id: transformedLesson.id,
                    title: transformedLesson.title,
                    type: transformedLesson.type,
                    hasContent: !!(transformedLesson.content && Object.keys(transformedLesson.content).length > 0),
                    hasResources: transformedLesson.resources.length > 0,
                    hasQuiz: !!transformedLesson.quiz,
                    quizQuestionsCount: transformedLesson.quiz?.questions?.length || 0,
                  })
                  
                  return transformedLesson
                }),
                settings: {
                  isPublished: course.is_published || false,
                  requiresSequentialProgress: course.requires_sequential_progress !== undefined ? course.requires_sequential_progress : true,
                  minimumQuizScore: course.minimum_quiz_score !== undefined ? course.minimum_quiz_score : 50,
                  enrollment: {
                    enrollmentMode: course.enrollment_mode || "free",
                    price: course.price !== undefined ? course.price : undefined,
                  },
                  certificate: {
                    certificateEnabled: course.certificate_enabled || false,
                    certificateTemplate: course.certificate_template || "",
                    // Only set certificateTitle if it's a non-empty string, otherwise undefined
                    // This ensures the certificate type selection is preserved correctly
                    certificateTitle: (course.certificate_title && course.certificate_title.trim() !== "") 
                      ? course.certificate_title.trim() 
                      : undefined,
                    certificateDescription: course.certificate_description || "",
                    signatureImage: course.signature_image || "",
                    signatureName: course.signature_name || "",
                    signatureTitle: course.signature_title || "",
                    additionalText: course.additional_text || "",
                    certificateType: course.certificate_type || "completion",
                  },
                  prerequisites: course.prerequisites || { enabled: false, courseIds: [] },
                  instructor: course.settings?.instructor || { instructorEnabled: false, instructorIds: [] },
                },
              })
              // Ensure currentCourseId is set so auto-save uses the correct localStorage key
              setCurrentCourseId(editCourseId)
              
              // Clear any stale localStorage data for this course to ensure we use fresh database data
              // The auto-save hook will create a new localStorage entry with the fresh data
              try {
                const storageKey = `course-draft-${editCourseId}`
                localStorage.removeItem(storageKey)
              } catch (error) {
                console.warn("Failed to clear localStorage:", error)
              }
            } else {
              console.warn("Course data not found in response:", result)
            }
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error("Failed to load course:", response.status, errorData)
            toast.error(errorData.error || "Failed to load course. Please try again.")
          }
        } catch (error: any) {
          console.error("Error loading course:", error)
          toast.error(error?.message || "Failed to load course. Please try again.")
        } finally {
          setLoading(false)
        }
      } else {
        // Load draft from localStorage for new courses
        const loadDraftData = async () => {
          const draft = await loadDraft()
          if (draft) {
            setCourseData(draft)
          }
        }
        loadDraftData()
      }
    }
    loadCourseData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCourseId]) // Only run when editCourseId changes

  const updateCourseData = useCallback((section: keyof typeof courseData, data: any) => {
    setCourseData((prev) => {
      const updatedSection = typeof data === "function" ? data(prev[section]) : data
      if (JSON.stringify(prev[section]) !== JSON.stringify(updatedSection)) {
        const updated = {
          ...prev,
          [section]: updatedSection,
        }
        // Update ref synchronously to ensure draft/publish always use latest state
        courseDataRef.current = updated
        return updated
      }
      // Even if section didn't change, update ref to ensure it's always in sync
      courseDataRef.current = prev
      return prev
    })
  }, [])
  

  const handleSaveDraft = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent multiple clicks during save
    if (isSavingDraft || isPublishing) {
      return
    }
    
    // Get the latest courseData - ensure we have the absolute latest including file uploads
    // Use a small delay to ensure any pending state updates have completed
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Read from both ref and state, merge to ensure we have all file URLs
    const refData = courseDataRef.current
    const stateData = courseData
    
    // Also check localStorage as fallback (auto-save saves there and should have file URLs)
    let localStorageData: typeof courseData | null = null
    try {
      const currentId = currentCourseId || editCourseId || "new"
      const storageKey = `course-draft-${currentId}`
      const draftJson = localStorage.getItem(storageKey)
      if (draftJson) {
        const draft = JSON.parse(draftJson)
        localStorageData = draft.data
      }
    } catch (error) {
      console.error("Failed to read from localStorage:", error)
    }
    
    // Merge: prioritize ref (synchronously updated), then state, then localStorage
    // This ensures file URLs from any source are preserved
    // Deep merge lessons by ID to preserve file URLs (works even if lessons are reordered)
    const refLessonsMap = new Map((refData.lessons || []).map((l: any) => [l.id, l]))
    const stateLessonsMap = new Map((stateData.lessons || []).map((l: any) => [l.id, l]))
    const localStorageLessonsMap = new Map((localStorageData?.lessons || []).map((l: any) => [l.id, l]))
    
    // Collect all unique lesson IDs
    const allLessonIds = new Set([
      ...(refData.lessons || []).map((l: any) => l.id),
      ...(stateData.lessons || []).map((l: any) => l.id),
      ...(localStorageData?.lessons || []).map((l: any) => l.id),
    ])
    
    // Merge lessons by ID, preserving file URLs from any source
    const mergedLessons = Array.from(allLessonIds).map((lessonId: any) => {
      const refLesson = refLessonsMap.get(lessonId)
      const stateLesson = stateLessonsMap.get(lessonId)
      const localStorageLesson = localStorageLessonsMap.get(lessonId)
      
      // Merge content objects - priority: ref > state > localStorage (ref is most recent)
      const mergedContent = {
        ...(localStorageLesson?.content || {}),
        ...(stateLesson?.content || {}),
        ...(refLesson?.content || {}),
      }
      
      return {
        ...(localStorageLesson || {}),
        ...(stateLesson || {}),
        ...(refLesson || {}),
        content: mergedContent,
      }
    })
    
    const currentCourseData = {
      ...(localStorageData || {}),
      ...stateData,
      ...refData,
      basicInfo: {
        ...(localStorageData?.basicInfo || {}),
        ...stateData.basicInfo,
        ...refData.basicInfo,
      },
      lessons: mergedLessons,
    }
    
    console.log("Save to Draft clicked", { 
      title: currentCourseData.basicInfo.title,
      previewVideo: currentCourseData.basicInfo.previewVideo,
      thumbnail: currentCourseData.basicInfo.thumbnail,
      hasVideo: !!currentCourseData.basicInfo.previewVideo,
      hasThumbnail: !!currentCourseData.basicInfo.thumbnail,
      lessonsCount: currentCourseData.lessons.length,
      lessonsWithVideo: currentCourseData.lessons.filter((l: any) => l.content?.url).length,
      source: {
        refHasVideo: !!refData.basicInfo.previewVideo,
        stateHasVideo: !!stateData.basicInfo.previewVideo,
        localStorageHasVideo: !!localStorageData?.basicInfo.previewVideo,
      },
    })
    
    // Validate course title is required
    if (!currentCourseData.basicInfo.title || currentCourseData.basicInfo.title.trim() === "") {
      console.log("Validation failed: Course title is required")
      toast.error("Course title is required. Please enter a course title before saving.")
      return
    }

    console.log("Starting save draft...")
    setIsSavingDraft(true)
    try {
      const currentId = currentCourseId || editCourseId || "new"
      const response = await fetch("/api/courses/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: currentId,
          courseData: currentCourseData, // Use latest builder state, not localStorage
          isPublished: false, // Save as draft
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save draft")
      }

      const result = await response.json()
      
      console.log("Draft saved successfully:", result)
      
      // Get the final courseId (from result, current state, or edit param)
      const finalCourseId = result.courseId || currentCourseId || editCourseId
      
      // Update currentCourseId state immediately if we got a new ID
      if (result.courseId && result.courseId !== currentId) {
        setCurrentCourseId(result.courseId.toString())
        router.replace(`/admin/courses/new?edit=${result.courseId}`)
      }
      
      // Remove all old localStorage drafts for this course to prevent duplicates
      // Remove "new" draft if we started with "new"
      if (currentId === "new") {
        localStorage.removeItem("course-draft-new")
      }
      // Remove any localStorage entry with the old courseId (if we had one)
      if (currentId !== "new" && currentId !== finalCourseId.toString()) {
        localStorage.removeItem(`course-draft-${currentId}`)
      }
      
      // Update localStorage with the correct courseId - use the same key format as auto-save
      // This ensures the same course updates the same localStorage entry
      // Use currentCourseData to ensure we save the latest builder state
      const storageKey = `course-draft-${finalCourseId}`
      const draftData = {
        data: currentCourseData, // Use latest builder state
        savedAt: new Date().toISOString(),
        courseId: finalCourseId,
      }
      localStorage.setItem(storageKey, JSON.stringify(draftData))
      
      toast.success("Draft saved successfully")
      
      // Don't navigate away - stay on the page so user can continue editing
      // The draft is saved to the database, user can continue working
    } catch (error: any) {
      console.error("Error saving draft:", error)
      toast.error(error.message || "Failed to save draft")
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handlePublishCourse = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent multiple clicks during publish
    if (isSavingDraft || isPublishing) {
      return
    }
    
    // Get the latest courseData - ensure we have the absolute latest including file uploads
    // Use a small delay to ensure any pending state updates have completed
    await new Promise(resolve => setTimeout(resolve, 0))
    
    // Read from both ref and state, merge to ensure we have all file URLs
    const refData = courseDataRef.current
    const stateData = courseData
    
    // Also check localStorage as fallback (auto-save saves there and should have file URLs)
    let localStorageData: typeof courseData | null = null
    try {
      const currentId = currentCourseId || editCourseId || "new"
      const storageKey = `course-draft-${currentId}`
      const draftJson = localStorage.getItem(storageKey)
      if (draftJson) {
        const draft = JSON.parse(draftJson)
        localStorageData = draft.data
      }
    } catch (error) {
      console.error("Failed to read from localStorage:", error)
    }
    
    // Merge: prioritize ref (synchronously updated), then state, then localStorage
    // This ensures file URLs from any source are preserved
    // Deep merge lessons by ID to preserve file URLs (works even if lessons are reordered)
    const refLessonsMap = new Map((refData.lessons || []).map((l: any) => [l.id, l]))
    const stateLessonsMap = new Map((stateData.lessons || []).map((l: any) => [l.id, l]))
    const localStorageLessonsMap = new Map((localStorageData?.lessons || []).map((l: any) => [l.id, l]))
    
    // Collect all unique lesson IDs
    const allLessonIds = new Set([
      ...(refData.lessons || []).map((l: any) => l.id),
      ...(stateData.lessons || []).map((l: any) => l.id),
      ...(localStorageData?.lessons || []).map((l: any) => l.id),
    ])
    
    // Merge lessons by ID, preserving file URLs from any source
    const mergedLessons = Array.from(allLessonIds).map((lessonId: any) => {
      const refLesson = refLessonsMap.get(lessonId)
      const stateLesson = stateLessonsMap.get(lessonId)
      const localStorageLesson = localStorageLessonsMap.get(lessonId)
      
      // Merge content objects - priority: ref > state > localStorage (ref is most recent)
      const mergedContent = {
        ...(localStorageLesson?.content || {}),
        ...(stateLesson?.content || {}),
        ...(refLesson?.content || {}),
      }
      
      return {
        ...(localStorageLesson || {}),
        ...(stateLesson || {}),
        ...(refLesson || {}),
        content: mergedContent,
      }
    })
    
    const currentCourseData = {
      ...(localStorageData || {}),
      ...stateData,
      ...refData,
      basicInfo: {
        ...(localStorageData?.basicInfo || {}),
        ...stateData.basicInfo,
        ...refData.basicInfo,
      },
      lessons: mergedLessons,
    }
    
    console.log("Publish clicked", { 
      title: currentCourseData.basicInfo.title, 
      description: currentCourseData.basicInfo.description,
      previewVideo: currentCourseData.basicInfo.previewVideo,
      thumbnail: currentCourseData.basicInfo.thumbnail,
      hasVideo: !!currentCourseData.basicInfo.previewVideo,
      hasThumbnail: !!currentCourseData.basicInfo.thumbnail,
      lessonsCount: currentCourseData.lessons.length,
      lessonsWithVideo: currentCourseData.lessons.filter((l: any) => l.content?.url).length,
      source: {
        refHasVideo: !!refData.basicInfo.previewVideo,
        stateHasVideo: !!stateData.basicInfo.previewVideo,
        localStorageHasVideo: !!localStorageData?.basicInfo.previewVideo,
      },
    })
    
    // Validate all basic info fields are filled
    const basicInfo = currentCourseData.basicInfo
    const validationErrors: string[] = []
    
    if (!basicInfo.title || basicInfo.title.trim() === "") {
      validationErrors.push("Course title is required")
    }
    if (!basicInfo.description || basicInfo.description.trim() === "") {
      validationErrors.push("Course description is required")
    }
    if (!basicInfo.requirements || basicInfo.requirements.trim() === "") {
      validationErrors.push("Course requirements are required")
    }
    if (!basicInfo.whoIsThisFor || basicInfo.whoIsThisFor.trim() === "") {
      validationErrors.push("'Who this course is for' is required")
    }
    
    // Validate at least one lesson exists
    if (!currentCourseData.lessons || currentCourseData.lessons.length === 0) {
      validationErrors.push("At least one lesson is required to publish the course")
    }
    
    // Validate lessons have required fields
    if (currentCourseData.lessons && currentCourseData.lessons.length > 0) {
      const invalidLessons = currentCourseData.lessons.filter((lesson: any) => 
        !lesson.title || lesson.title.trim() === ""
      )
      if (invalidLessons.length > 0) {
        validationErrors.push("All lessons must have a title")
      }
    }
    
    // Show all validation errors at once
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error))
      return
    }

    console.log("Starting publish...", {
      courseId: currentCourseId || editCourseId || "new",
      currentSettingsIsPublished: currentCourseData.settings?.isPublished,
    })
    setIsPublishing(true)
    try {
      // Ensure settings.isPublished matches the publish intent
      const courseDataToSave = {
        ...currentCourseData,
        settings: {
          ...currentCourseData.settings,
          isPublished: true, // Explicitly set to true for publish
        },
      }
      
      const response = await fetch("/api/courses/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: currentCourseId || editCourseId || "new",
          courseData: courseDataToSave, // Use latest builder state with explicit isPublished
          isPublished: true, // Publish the course - this takes priority
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to publish course")
      }

      const result = await response.json()
      
      // If we got a courseId back and we were creating a new course, update the URL
      if (result.courseId && !currentCourseId && !editCourseId) {
        setCurrentCourseId(result.courseId.toString())
        router.replace(`/admin/courses/new?edit=${result.courseId}`)
      }
      
      // Clear draft on successful publish
      clearDraft()
      
      // Invalidate courses cache to refresh course list with updated published status
      invalidateCourses()
      
      toast.success("Course published successfully")
      
      // Navigate to courses page - it will show updated course status
      router.push("/admin/courses")
    } catch (error: any) {
      console.error("Error publishing course:", error)
      toast.error(error.message || "Failed to publish course")
    } finally {
      setIsPublishing(false)
    }
  }


  // Show skeleton while loading course data (only when editing)
  if (loading && editCourseId) {
    return (
      <div className="pt-4 md:pt-8 pb-[30px] md:pb-8 px-4 lg:px-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-9 w-48" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Card className="p-6">
          <Skeleton className="h-10 w-full mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="pt-4 md:pt-8 pb-[30px] md:pb-8 px-4 lg:px-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Just navigate back, don't clear draft (auto-saved drafts are retained)
              router.push("/admin/courses")
            }}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-primary">
            {searchParams?.get("edit") ? "Edit Course" : "New Course"}
          </h1>
        </div>
        <div className="space-x-2 flex items-center gap-4">
          <Button 
            type="button"
            variant="outline" 
            disabled={isSavingDraft || isPublishing}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Always allow click - validation will happen inside handler
              handleSaveDraft(e)
            }}
            className="cursor-pointer"
          >
            {isSavingDraft ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save to Draft"
            )}
          </Button>
          <Button 
            type="button"
            disabled={isSavingDraft || isPublishing}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Always allow click - validation will happen inside handler
              handlePublishCourse(e)
            }}
            className="cursor-pointer"
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish"
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-0 space-y-4">
              <CourseBasicInfo
                data={courseData.basicInfo}
                onUpdate={(data) => updateCourseData("basicInfo", data)}
                courseId={currentCourseId || editCourseId}
              />
            </TabsContent>

            <TabsContent value="lessons" className="mt-0 space-y-4">
              <LessonBuilder 
                lessons={courseData.lessons} 
                onUpdate={(lessons) => updateCourseData("lessons", lessons)}
                minimumQuizScore={courseData.settings.minimumQuizScore}
                courseId={currentCourseId || editCourseId}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-4">
              <CourseSettings
                settings={courseData.settings}
                onUpdate={(settings) => updateCourseData("settings", settings)}
                courseId={currentCourseId || editCourseId}
                instructors={instructors}
                onInstructorsChange={setInstructors}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-0 space-y-4">
              <CoursePreview courseData={courseData} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

function CourseBuilderSkeleton() {
  return (
    <div className="pt-4 md:pt-8 pb-[30px] md:pb-8 px-4 lg:px-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Card className="p-6">
        <Skeleton className="h-10 w-full mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    </div>
  )
}

export default function NewCoursePage() {
  return (
    <Suspense fallback={<CourseBuilderSkeleton />}>
      <NewCourseContent />
    </Suspense>
  )
}
