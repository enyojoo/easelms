"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { extractIdFromSlug, createCourseSlug } from "@/lib/slug"
import { useClientAuthState } from "@/utils/client-auth"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, ArrowLeft, Clock, PlayCircle, FileText, List, Eye } from "lucide-react"
import VideoPlayer from "./components/VideoPlayer"
import QuizComponent from "./components/QuizComponent"
import ResourcesPanel from "./components/ResourcesPanel"
import TextContentWithTracking from "./components/TextContentWithTracking"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCourse, useEnrollments, useProgress, useQuizResults, useRealtimeProgress, useRealtimeQuizResults, useSaveProgress, useEnrollCourse } from "@/lib/react-query/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useQuizData } from "./hooks/useQuizData"
import { useCourseProgress } from "./hooks/useCourseProgress"
import { logError, logInfo, logWarning, formatErrorMessage, handleApiError } from "./utils/errorHandler"
import ErrorState from "@/components/ErrorState"

interface Course {
  id: number
  title: string
  lessons: Array<{
    id: number
    title: string
    type?: string
    settings?: any
    resources?: Array<any>
    quiz_questions?: Array<any>
    // Content fields (spread from lesson.content)
    url?: string
    html?: string
    text?: string
    estimatedDuration?: number
    type?: string
  }>
}

export default function CourseLearningPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slugOrId = params.id as string
  const id = extractIdFromSlug(slugOrId) // Extract actual ID from slug if present
  const { user, loading: authLoading, userType } = useClientAuthState()
  const paymentSuccess = searchParams.get("payment") === "success"
  const lessonIndexParam = searchParams.get("lessonIndex")
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [activeTab, setActiveTab] = useState("video")
  const [allLessonsCompleted, setAllLessonsCompleted] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [lessonStartTime, setLessonStartTime] = useState<number | null>(null)
  const [timeLimitExceeded, setTimeLimitExceeded] = useState(false)
  const [textViewed, setTextViewed] = useState<{ [key: number]: boolean }>({})
  const [videoCompleted, setVideoCompleted] = useState<{ [key: number]: boolean }>({}) // Track video completion separately for mixed lessons
  const progressSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textViewedRefs = useRef<{ [key: number]: { viewed: boolean; scrollTop: number; scrollHeight: number } }>({})
  const showingQuizResultsRef = useRef<{ [lessonId: number]: boolean }>({}) // Track if quiz results are showing for a lesson

  // Use React Query hooks for data fetching
  const { data: courseData, isPending: coursePending, error: courseError } = useCourse(id)
  const { data: enrollmentsData, isPending: enrollmentsPending } = useEnrollments()
  const { data: progressData } = useProgress(id)
  const { data: quizResultsData } = useQuizResults(id)
  const saveProgressMutation = useSaveProgress()
  const enrollCourseMutation = useEnrollCourse()
  const queryClient = useQueryClient()
  
  // Set up real-time subscriptions for progress and quiz results
  useRealtimeProgress(id, user?.id)
  useRealtimeQuizResults(id, user?.id)

  const course = courseData?.course

  // Calculate progress using custom hook
  // Ensure safe defaults even if progressData is undefined
  const progressResult = useCourseProgress({
    course,
    progressData,
  })
  const completedLessons = progressResult?.completedLessons || []
  const progress = progressResult?.progress || 0
  const allCompleted = progressResult?.allCompleted || false

  // Update all lessons completed state
  useEffect(() => {
    setAllLessonsCompleted(allCompleted)
  }, [allCompleted])

  // Track if we've already marked enrollment as completed to prevent duplicate calls
  const enrollmentMarkedRef = useRef(false)

  // Check if course is already completed (don't auto-mark if already completed)
  const courseIdForEnrollment = parseInt(id)
  const enrollmentForStatus = enrollmentsData?.enrollments?.find((e: any) => e.course_id === courseIdForEnrollment)
  const isCourseCompleted = enrollmentForStatus?.status === "completed"

  // Mark enrollment as completed when all lessons are completed (only if not already completed)
  useEffect(() => {
    if (allLessonsCompleted && course && id && user && !enrollmentMarkedRef.current && !isCourseCompleted) {
      // Mark enrollment as completed
      const markEnrollmentCompleted = async () => {
        try {
          logInfo("Marking enrollment as completed", { courseId: parseInt(id), allLessonsCompleted })
          enrollmentMarkedRef.current = true
          
          const response = await fetch("/api/enrollments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId: parseInt(id),
              status: "completed",
            }),
          })
          
          if (response.ok) {
            await queryClient.refetchQueries({ queryKey: ["enrollments"] })
            await queryClient.refetchQueries({ queryKey: ["progress", id] })
          } else {
            const error = await handleApiError(response)
            logError("Failed to mark enrollment as completed", error, {
              component: "CourseLearningPage",
              action: "markEnrollmentCompleted",
              courseId: parseInt(id),
            })
            enrollmentMarkedRef.current = false // Reset on error so we can retry
            toast.error(formatErrorMessage(error, "Failed to mark course as completed"))
          }
        } catch (error) {
          logError("Error marking course as completed", error, {
            component: "CourseLearningPage",
            action: "markEnrollmentCompleted",
            courseId: parseInt(id),
          })
          enrollmentMarkedRef.current = false // Reset on error so we can retry
          toast.error(formatErrorMessage(error, "Failed to mark course as completed"))
        }
      }
      markEnrollmentCompleted()
    }
  }, [allLessonsCompleted, course, id, user, queryClient, isCourseCompleted])

  // Revert enrollment status to active if progress changes and not all lessons are completed
  // This handles cases where a quiz is retaken and failed, making a lesson incomplete
  useEffect(() => {
    if (!course || !id || !user) return
    
    // If not all lessons are completed but enrollment is marked as completed
    if (!allLessonsCompleted && isCourseCompleted) {
      const revertEnrollmentStatus = async () => {
        try {
          logInfo("Reverting enrollment to active - not all lessons completed", { 
            courseId: parseInt(id), 
            allLessonsCompleted,
            completedLessonsCount: completedLessons.length,
            totalLessons: course.lessons?.length || 0
          })
          enrollmentMarkedRef.current = false // Reset flag so it can be marked completed again when all lessons are done
          
          const response = await fetch("/api/enrollments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId: parseInt(id),
              status: "active",
            }),
          })
          
          if (response.ok) {
            await queryClient.refetchQueries({ queryKey: ["enrollments"] })
            logInfo("Enrollment status reverted to active", { courseId: parseInt(id) })
          } else {
            const error = await handleApiError(response)
            logError("Failed to revert enrollment status", error, {
              component: "CourseLearningPage",
              action: "revertEnrollmentStatus",
              courseId: parseInt(id),
            })
            toast.error(formatErrorMessage(error, "Failed to update course status"))
          }
        } catch (error) {
          logError("Error reverting enrollment status", error, {
            component: "CourseLearningPage",
            action: "revertEnrollmentStatus",
            courseId: parseInt(id),
          })
        }
      }
      revertEnrollmentStatus()
    }
  }, [allLessonsCompleted, isCourseCompleted, course, id, user, queryClient, completedLessons.length])

  // Track if we've processed the lessonIndex parameter to prevent duplicate processing
  const lessonIndexProcessedRef = useRef(false)

  // Helper function to get initial tab based on lesson type
  const getInitialTab = (lesson: any): string => {
    if (!lesson) return "video"
    const lessonType = lesson.type || (lesson.url ? "video" : "text")
    const hasVideo = !!lesson.url
    const hasText = !!(lesson.html || lesson.text)
    const isMixed = lessonType === "mixed" && hasVideo && hasText
    
    if (isMixed || hasVideo) {
      return "video"
    } else if (hasText) {
      return "text"
    }
    return "video" // Default fallback
  }

  // Set initial lesson index from query parameter or find first incomplete lesson
  // Only runs on initial load - does NOT run when completedLessons changes during quiz completion
  const initialLessonSetRef = useRef(false)
  useEffect(() => {
    if (!course || !progressData?.progress) return

    // If lessonIndex is provided in query params, use it (only process once)
    if (lessonIndexParam !== null && !lessonIndexProcessedRef.current) {
      const index = parseInt(lessonIndexParam, 10)
      if (!isNaN(index) && index >= 0 && index < (course.lessons?.length || 0)) {
        lessonIndexProcessedRef.current = true
        initialLessonSetRef.current = true
        setCurrentLessonIndex(index)
        // Reset active tab based on lesson type
        const lesson = course.lessons[index]
        setActiveTab(getInitialTab(lesson))
        
        // Remove lessonIndex from URL to prevent reprocessing
        const url = new URL(window.location.href)
        url.searchParams.delete('lessonIndex')
        window.history.replaceState({}, '', url.toString())
        return
      }
    }

    // Only run auto-detection logic once on initial load
    // Don't auto-navigate when completedLessons changes after quiz completion
    if (initialLessonSetRef.current) return

    // If course is already completed, always start from first lesson (lesson 0)
    if (isCourseCompleted && course.lessons && course.lessons.length > 0) {
      initialLessonSetRef.current = true
      setCurrentLessonIndex(0)
      setActiveTab(getInitialTab(course.lessons[0]))
      return
    }

    // Otherwise, find the first incomplete lesson (only on initial load)
    if (completedLessons.length > 0 && course.lessons) {
      for (let i = 0; i < course.lessons.length; i++) {
        if (!completedLessons.includes(i)) {
          initialLessonSetRef.current = true
          setCurrentLessonIndex(i)
          setActiveTab(getInitialTab(course.lessons[i]))
          return
        }
      }
      // All lessons completed, go to last lesson
      if (course.lessons.length > 0) {
        initialLessonSetRef.current = true
        setCurrentLessonIndex(course.lessons.length - 1)
        setActiveTab(getInitialTab(course.lessons[course.lessons.length - 1]))
      }
    }
  }, [course, progressData, lessonIndexParam, isCourseCompleted]) // Removed completedLessons from dependencies to prevent auto-navigation

  // Cleanup: Pause all videos when lesson index changes (but preserve video state during viewport changes)
  useEffect(() => {
    // Only pause videos if we're actually changing to a different lesson
    // This prevents unnecessary pausing when the component re-renders due to viewport changes
    const allVideos = document.querySelectorAll('video')
    allVideos.forEach((video) => {
      // Only reset if video is playing - don't interrupt paused videos unnecessarily
      if (!video.paused) {
        video.pause()
        video.currentTime = 0
      }
    })
    
    // Clear quiz results flag when lesson changes (user navigated away from quiz results)
    const currentLesson = course?.lessons?.[currentLessonIndex]
    if (currentLesson?.id) {
      // Only clear if we're not on the quiz tab (user navigated away)
      if (activeTab !== "quiz") {
        showingQuizResultsRef.current[currentLesson.id] = false
      }
    }
  }, [currentLessonIndex, activeTab, course])

  // Process quiz data using custom hook
  // Ensure we always have safe defaults even if data is undefined
  const quizDataResult = useQuizData({
    quizResultsData,
    progressData,
    course,
  })
  const completedQuizzes = quizDataResult?.completedQuizzes || {}
  const quizScores = quizDataResult?.quizScores || {}
  const quizAnswers = quizDataResult?.quizAnswers || {}
  const quizAttemptCounts = quizDataResult?.quizAttemptCounts || {}
  const shuffleData = quizDataResult?.shuffleData || {}

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/learner/login")
    }
  }, [authLoading, user, router])

  // Check enrollment and redirect if not enrolled
  // Handle payment=success by enrolling the user (similar to free courses)
  useEffect(() => {
    if (!id || !course || !user) return

    const courseId = parseInt(id)

    // If payment was successful, enroll the user and create payment record (like webhooks do)
    if (paymentSuccess) {
      // For testing purposes, simulate webhook behavior: enroll user and create payment record
      // In production, this should be handled by payment gateway webhooks only
      const enrollAndCreatePayment = async () => {
        try {
          // Enroll the user (like webhooks do)
          await enrollCourseMutation.mutateAsync(courseId)

          // Create payment record (simulating webhook behavior for testing)
          // Note: In production, this should only be done by payment gateway webhooks
          const paymentResponse = await fetch("/api/payments/record-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId: courseId,
              userId: user?.id,
              amount: course?.price || 0,
              gateway: "test" // Since we don't know which gateway was used
            })
          })

          if (!paymentResponse.ok) {
            console.warn("Failed to create payment record, but enrollment succeeded")
          }

          // Success - invalidate caches and clean up URL
          queryClient.invalidateQueries({ queryKey: ["enrollments"] })
          queryClient.invalidateQueries({ queryKey: ["progress", id] })
          queryClient.invalidateQueries({ queryKey: ["purchases"] }) // Invalidate purchases cache

          // Remove query param and prevent back button to payment gateway
          const url = new URL(window.location.href)
          url.searchParams.delete("payment")
          window.history.replaceState({}, "", url.toString())

          toast.success("Payment successful! You are now enrolled in this course.")
        } catch (error) {
          console.error("Failed to enroll after payment success:", error)
          // If enrollment fails, redirect back to course page
          router.push(`/learner/courses/${createCourseSlug(course.title, courseId)}`)
        }
      }

      enrollAndCreatePayment()
    }

    // Normal enrollment check (only if we have enrollment data)
    // Don't redirect if enrollment data is still loading (enrollment might be in progress)
    if (enrollmentsPending) return

    // Don't redirect if we don't have enrollment data yet (might be loading)
    if (!enrollmentsData?.enrollments) return

    const enrollment = enrollmentsData.enrollments.find((e: any) => e.course_id === courseId)
    
    if (!enrollment) {
      // Only redirect if payment was not successful (to avoid redirect loop)
      if (!paymentSuccess) {
        router.push(`/learner/courses/${createCourseSlug(course.title, courseId)}`)
      }
    }
  }, [id, enrollmentsData, enrollmentsPending, course, router, paymentSuccess, queryClient])

  // Save progress to API (debounced)
  const saveProgress = async (
    lessonId: number,
    completed: boolean,
    quizPassed?: boolean,
    scorePercentage?: number,
    quizAttempts?: number
  ) => {
    if (!course || !id) return

    // Clear existing timeout
    if (progressSaveTimeoutRef.current) {
      clearTimeout(progressSaveTimeoutRef.current)
    }

    // Debounce progress saves
    progressSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const progressPayload: any = {
          course_id: parseInt(id),
          lesson_id: lessonId,
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          quiz_score: quizPassed && scorePercentage !== undefined ? Math.round(scorePercentage) : null,
          quiz_attempts: quizAttempts !== undefined ? quizAttempts : null,
        }

        await saveProgressMutation.mutateAsync(progressPayload)
      } catch (error) {
        logError("Error saving progress", error, {
          component: "CourseLearningPage",
          action: "saveProgress",
          lessonId,
          courseId: parseInt(id),
        })
      }
    }, 1000) // Debounce by 1 second
  }


  // Check if required lessons are completed before allowing access
  const canAccessLesson = (lessonIndex: number): boolean => {
    if (!course) return false
    const lesson = course.lessons[lessonIndex]
    if (!lesson) return false
    
    // Check lesson settings for required flag
    const settings = lesson.settings
    const isRequired = settings && typeof settings === "object" ? (settings as any).isRequired : false
    
    // If lesson is not required, always allow access
    if (!isRequired) return true

    // Check if all previous required lessons are completed
    for (let i = 0; i < lessonIndex; i++) {
      const prevLesson = course.lessons[i]
      if (prevLesson) {
        const prevSettings = prevLesson.settings
        const prevIsRequired = prevSettings && typeof prevSettings === "object" ? (prevSettings as any).isRequired : false
        if (prevIsRequired && !completedLessons.includes(i)) {
          return false
        }
      }
    }

    return true
  }


  // Handle video completion (for video-only and mixed lessons)
  const handleVideoComplete = async () => {
    if (!course) return

    const lesson = course.lessons[currentLessonIndex]
    if (!lesson) return

    const lessonType = (lesson as any).type || ((lesson as any).url ? "video" : "text")
    const isMixedLesson = lessonType === "mixed"
    const hasVideo = !!(lesson as any).url
    const hasText = !!((lesson as any).html || (lesson as any).text)

    // For mixed lessons, mark video as completed and navigate to text tab
    if (isMixedLesson && hasVideo && hasText) {
      setVideoCompleted((prev) => ({ ...prev, [currentLessonIndex]: true }))
      
      // Check if text was already viewed - if so, mark lesson as completed (if no quiz)
      if (textViewed[currentLessonIndex]) {
        await proceedWithLessonCompletion()
      }
      
      // Navigate to text tab when video completes - user navigates from there manually
      setActiveTab("text")
      return
    }

    // For video-only lessons, check if there's a quiz
    const hasQuiz = lesson.quiz_questions && lesson.quiz_questions.length > 0
    const hasResources = lesson.resources && lesson.resources.length > 0

    if (hasQuiz) {
      setActiveTab("quiz")
    } else {
      // Video-only lesson without quiz - mark as completed
      // Stay on current tab (video) - user can navigate to resources tab manually if available
      await proceedWithLessonCompletion()
      // No auto-navigation - user stays on video tab and navigates manually
    }
  }

  // Handle text completion (for text-only and mixed lessons)
  const handleTextComplete = async () => {
    if (!course) return

    const lesson = course.lessons[currentLessonIndex]
    if (!lesson) return

    const lessonType = (lesson as any).type || ((lesson as any).url ? "video" : "text")
    const isMixedLesson = lessonType === "mixed"
    const hasVideo = !!(lesson as any).url
    const hasText = !!((lesson as any).html || (lesson as any).text)

    setTextViewed((prev) => ({ ...prev, [currentLessonIndex]: true }))

    // For mixed lessons, check if both video and text are completed
    if (isMixedLesson && hasVideo && hasText) {
      // Check if video was also completed
      if (videoCompleted[currentLessonIndex]) {
        // Both video and text are completed
        // Check if there's a quiz or resources to navigate to
        const hasQuiz = lesson.quiz_questions && lesson.quiz_questions.length > 0
        const hasResources = lesson.resources && lesson.resources.length > 0
        
        // Mark lesson as completed (proceedWithLessonCompletion handles quiz navigation)
        await proceedWithLessonCompletion()
        
        // If no quiz, navigate to resources if available
        // (If there was a quiz, proceedWithLessonCompletion already navigated to quiz tab)
        if (!hasQuiz && hasResources) {
          setActiveTab("resources")
        }
        // If no quiz/resources, stay on text tab - user can navigate manually
      }
      // If video not completed yet, wait for it (it will check text when video completes)
    } else if (!isMixedLesson && hasText) {
      // Text-only lesson - mark as completed (if no quiz)
      await proceedWithLessonCompletion()
      // User navigates manually from text-only lessons
    }
  }

  // Common completion logic - mark lesson as completed (no auto-navigation)
  // User navigates manually - this function only saves progress
  const proceedWithLessonCompletion = async () => {
    if (!course) return

    const lesson = course.lessons[currentLessonIndex]
    if (!lesson) return

    // Check if lesson has a quiz
    const hasQuiz = lesson.quiz_questions && lesson.quiz_questions.length > 0

    // If there's a quiz, explicitly save progress with completed: false
    // Lesson will only be marked as completed when quiz is passed
    if (hasQuiz) {
      // Ensure lesson is NOT marked as completed - explicitly set to false
      // This prevents any previous completed: true from persisting
      // Save immediately (no debounce) to ensure it's saved right away
      try {
        const progressPayload: any = {
          course_id: parseInt(id),
          lesson_id: lesson.id,
          completed: false,
          completed_at: null,
        }
        await saveProgressMutation.mutateAsync(progressPayload)
      } catch (error) {
        logError("Error saving progress", error, {
          component: "CourseLearningPage",
          action: "handleVideoComplete",
          lessonId: lesson.id,
          courseId: parseInt(id),
        })
      }
      // Navigate to quiz tab (for video-only lessons after video completes)
      setActiveTab("quiz")
      return
    }

    // Only mark as completed if there's no quiz
    // User navigates manually - no auto-advance
    if (!completedLessons.includes(currentLessonIndex)) {
      // Save progress immediately (no debounce) to ensure lesson is marked complete
      try {
        const progressPayload: any = {
          course_id: parseInt(id),
          lesson_id: lesson.id,
          completed: true,
          completed_at: new Date().toISOString(),
        }
        await saveProgressMutation.mutateAsync(progressPayload)
        // Refetch progress cache to refresh the UI
        await queryClient.refetchQueries({ queryKey: ["progress", id] })
      } catch (error) {
        logError("Error saving lesson completion", error, {
          component: "CourseLearningPage",
          action: "proceedWithLessonCompletion",
          lessonId: lesson.id,
          courseId: parseInt(id),
        })
      }
    }
    // No auto-navigation - user navigates manually via buttons/tabs
  }

  // Legacy handler for backward compatibility (used for non-mixed lessons)
  const handleLessonComplete = async () => {
    if (!course) return

    const lesson = course.lessons[currentLessonIndex]
    if (!lesson) return

    const lessonType = (lesson as any).type || ((lesson as any).url ? "video" : "text")
    const isMixedLesson = lessonType === "mixed"
    
    // For mixed lessons, this should not be called directly - use handleVideoComplete/handleTextComplete
    if (isMixedLesson) {
      logWarning("handleLessonComplete called for mixed lesson - this should not happen", {
        component: "CourseLearningPage",
        action: "handleLessonComplete",
        lessonId: lesson.id,
      })
      return
    }

    // For non-mixed lessons, proceed with completion
    await proceedWithLessonCompletion()
  }

  const clearQuizData = async (lessonId: number) => {
    // Clear the quiz results flag when user retries
    if (lessonId) {
      showingQuizResultsRef.current[lessonId] = false
    }
    try {
      logInfo("Clearing quiz data for lesson", { lessonId })
      
      // Immediately remove quiz results for this lesson from cache for instant UI update
      const currentData = queryClient.getQueryData<{ results: any[] }>(["quiz-results", id])
      if (currentData?.results) {
        const filteredResults = currentData.results.filter((r: any) => r.lesson_id !== lessonId)
        queryClient.setQueryData(["quiz-results", id], { results: filteredResults })
      }
      
      // Also update progress to remove quiz_score for this lesson
      const currentProgress = queryClient.getQueryData<{ progress: any[] }>(["progress", id])
      if (currentProgress?.progress) {
        const updatedProgress = currentProgress.progress.map((p: any) => {
          if (p.lesson_id === lessonId) {
            return { ...p, quiz_score: null, quiz_attempts: null }
          }
          return p
        })
        queryClient.setQueryData(["progress", id], { progress: updatedProgress })
      }
      
      // Refetch course data to get fresh quiz questions (with new shuffle if enabled)
      await queryClient.refetchQueries({ queryKey: ["course", id] })
      
      // Invalidate quiz attempt query to refetch the new attempt number
      queryClient.invalidateQueries({ queryKey: ["quiz-attempt", id, lessonId] })
      
      // DON'T refetch quiz-results and progress - keep them cleared in cache
      // This prevents showResultsOnly from becoming true again during retry
      // They will be refetched automatically when the user completes the quiz again
    } catch (error: any) {
      logError("Error clearing quiz data", error, {
        component: "CourseLearningPage",
        action: "clearQuizData",
        lessonId,
        courseId: id,
      })
      toast.error(error?.message || "Failed to reset quiz. Please refresh the page.")
      throw error
    }
  }


  const handleQuizComplete = async (answers?: number[], questions?: any[], attemptCount?: number) => {
    if (!course || !id) return

    const lesson = course.lessons[currentLessonIndex]
    if (!lesson) return

    // Mark that quiz results are showing for this lesson - prevent auto-navigation
    showingQuizResultsRef.current[lesson.id] = true

    // Calculate quiz score to check if passed
    let quizPassed = false
    let scorePercentage = 0
    
    if (answers && answers.length > 0 && questions && questions.length > 0) {
      let pointsEarned = 0
      let totalPoints = 0
      
      // Calculate points earned and total points
      for (let i = 0; i < answers.length; i++) {
        const question = questions[i]
        const userAnswer = answers[i]
        const isCorrect = question && userAnswer === question.correctAnswer
        const questionPoints = (question as any)?.points || 1
        
        totalPoints += questionPoints
        if (isCorrect) {
          pointsEarned += questionPoints
        }
      }
      
      scorePercentage = totalPoints > 0 ? (pointsEarned / totalPoints) * 100 : 0
      const minimumScore = course?.settings?.minimumQuizScore || 50
      quizPassed = scorePercentage >= minimumScore

      logInfo("Quiz score calculated", {
        scorePercentage: scorePercentage.toFixed(0),
        pointsEarned,
        totalPoints,
        minimumScore,
        passed: quizPassed,
      })
    } else {
      logWarning("Cannot calculate score - missing answers or questions", { answers, questions })
    }

    // Quiz results are saved by QuizComponent via API
    // Note: Quiz results cache will be updated via real-time subscription or manual refetch

    // Always save progress immediately (no debounce for quiz completion)
    // This ensures quiz results and progress are saved to the database
    try {
      const progressPayload: any = {
        course_id: parseInt(id),
        lesson_id: lesson.id,
        completed: quizPassed, // Only mark as completed if quiz passed
        completed_at: quizPassed ? new Date().toISOString() : null,
        quiz_score: scorePercentage !== undefined ? Math.round(scorePercentage) : null,
        quiz_attempts: attemptCount !== undefined ? attemptCount : null,
      }

      // Save immediately (no debounce) for quiz completion
      await saveProgressMutation.mutateAsync(progressPayload)
      
      // Use invalidateQueries instead of refetchQueries to avoid blocking
      // This ensures data is refreshed without blocking the UI
      queryClient.invalidateQueries({ queryKey: ["progress", id] })
      queryClient.invalidateQueries({ queryKey: ["quiz-results", id] })
    } catch (error) {
      logError("Error saving quiz progress", error, {
        component: "CourseLearningPage",
        action: "handleQuizComplete",
        lessonId: lesson.id,
        courseId: parseInt(id),
      })
      toast.error(formatErrorMessage(error, "Failed to save quiz progress"))
    }

    // Mark lesson as completed ONLY if quiz was passed
    logInfo("Checking lesson completion", {
      quizPassed,
      currentLessonIndex,
      lessonId: lesson.id,
    })
    
    // Don't auto-navigate - keep user on quiz results screen
  }

  const handleContinueFromQuiz = () => {
    // Continue button on quiz results - navigate to next lesson or resources
    if (!course) return

    const hasResources = course.lessons[currentLessonIndex]?.resources && course.lessons[currentLessonIndex].resources.length > 0
    
    if (hasResources) {
      // If current lesson has resources, go to resources tab
      setActiveTab("resources")
    } else if (currentLessonIndex < course.lessons.length - 1) {
      // Go to next lesson
      const nextIndex = currentLessonIndex + 1
      if (!canAccessLesson(nextIndex)) {
        toast.error("You must complete all current lesson requirements like passing the quiz before moving to the next lesson")
        return
      }
      const nextLesson = course.lessons[nextIndex]
      setCurrentLessonIndex(nextIndex)
      setActiveTab(getInitialTab(nextLesson))
      setTimeLimitExceeded(false)
    }
    // If it's the last lesson and no resources, stay on quiz results - "Complete Course" button will show
  }

  const handleNextLesson = () => {
    if (!course) return
    
    const currentLesson = course.lessons[currentLessonIndex]
    if (!currentLesson) return
    
    // Prevent navigation if quiz results are showing for current lesson
    if (currentLesson.id && showingQuizResultsRef.current[currentLesson.id]) {
      logInfo("Preventing navigation - quiz results are showing", { lessonId: currentLesson.id })
      return
    }
    
    const lessonType = (currentLesson as any).type || ((currentLesson as any).url ? "video" : "text")
    const hasVideo = !!(currentLesson as any).url
    const hasText = !!((currentLesson as any).html || (currentLesson as any).text)
    const isMixed = lessonType === "mixed" && hasVideo && hasText

    if (activeTab === "video" || activeTab === "text") {
      // For mixed lessons, navigate from video to text, or from text to quiz/resources/next lesson
      if (isMixed && activeTab === "video") {
        // From video tab in mixed lesson, go to text tab
        setActiveTab("text")
        return
      }
      
      // Navigate to next available tab: quiz -> resources -> next lesson
      const hasQuiz = currentLesson.quiz_questions && currentLesson.quiz_questions.length > 0
      const hasResources = currentLesson.resources && currentLesson.resources.length > 0
      
      if (hasQuiz) {
        setActiveTab("quiz")
      } else if (hasResources) {
        setActiveTab("resources")
      } else {
        // No quiz or resources, go to next lesson
        if (currentLessonIndex < course.lessons.length - 1) {
          const nextIndex = currentLessonIndex + 1
          if (!canAccessLesson(nextIndex)) {
            toast.error("You must complete all current lesson requirements like passing the quiz before moving to the next lesson")
            return
          }
          const nextLesson = course.lessons[nextIndex]
          setCurrentLessonIndex(nextIndex)
          setActiveTab(getInitialTab(nextLesson))
          setTimeLimitExceeded(false)
        } else {
          router.push(`/learner/courses/${createCourseSlug(course?.title || "", parseInt(id))}/learn/summary`)
        }
      }
    } else if (activeTab === "quiz") {
      // From quiz, go to resources if available, otherwise next lesson
      const hasResources = currentLesson.resources && currentLesson.resources.length > 0
      if (hasResources) {
        setActiveTab("resources")
      } else {
        // No resources, go to next lesson
        if (currentLessonIndex < course.lessons.length - 1) {
          const nextIndex = currentLessonIndex + 1
          if (!canAccessLesson(nextIndex)) {
            toast.error("You must complete all current lesson requirements like passing the quiz before moving to the next lesson")
            return
          }
          const nextLesson = course.lessons[nextIndex]
          setCurrentLessonIndex(nextIndex)
          setActiveTab(getInitialTab(nextLesson))
          setTimeLimitExceeded(false)
        } else {
          router.push(`/learner/courses/${createCourseSlug(course?.title || "", parseInt(id))}/learn/summary`)
        }
      }
    } else if (activeTab === "resources") {
      if (currentLessonIndex < course.lessons.length - 1) {
        const nextIndex = currentLessonIndex + 1
        // Check if can access next lesson
        if (!canAccessLesson(nextIndex)) {
          toast.error("You must complete all current lesson requirements like passing the quiz before moving to the next lesson")
          return
        }
        const nextLesson = course.lessons[nextIndex]
        setCurrentLessonIndex(nextIndex)
        setActiveTab(getInitialTab(nextLesson))
        setTimeLimitExceeded(false)
      } else {
        // All lessons completed, redirect to summary page
        router.push(`/learner/courses/${createCourseSlug(course?.title || "", parseInt(id))}/learn/summary`)
      }
    }
  }

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      const prevIndex = currentLessonIndex - 1
      // Check if can access previous lesson
      if (!canAccessLesson(prevIndex)) {
        toast.error("You must complete all current lesson requirements like passing the quiz before moving to the next lesson")
        return
      }
      const prevLesson = course.lessons[prevIndex]
      setCurrentLessonIndex(prevIndex)
      setActiveTab(getInitialTab(prevLesson))
      setTimeLimitExceeded(false)
    }
  }

  // Show error if course not found (only if no cached data exists)
  if (courseError && !course) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
        <ErrorState
          title="Failed to Load Course"
          message={formatErrorMessage(courseError, "Unable to load the course. Please try again.")}
          onRetry={() => {
            queryClient.refetchQueries({ queryKey: ["course", id] })
          }}
        />
      </div>
    )
  }

  // Render with cached data immediately - don't wait for pending state
  if (!course && authLoading) {
    return null // Wait for auth to complete
  }

  // If no course data exists at all, return null (will show on refetch)
  if (!course) {
    return null
  }

  // Ensure course.lessons exists and is an array before accessing
  if (!course.lessons || !Array.isArray(course.lessons) || course.lessons.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Loading course content...</p>
        </div>
      </div>
    )
  }

  // Ensure currentLessonIndex is valid
  const validLessonIndex = Math.max(0, Math.min(currentLessonIndex, course.lessons.length - 1))
  const currentLesson = course.lessons[validLessonIndex]
  
  if (!currentLesson) {
    logError("No current lesson found", new Error("Current lesson is undefined"), {
      component: "CourseLearningPage",
      currentLessonIndex,
      lessonsCount: course?.lessons?.length || 0,
      lessons: course.lessons
    })
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">No lesson content available for this course</p>
          <Button onClick={() => router.push("/learner/courses")}>Back to Courses</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background z-50 touch-pan-y">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="max-w-[1800px] mx-auto flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex-shrink-0 h-8 sm:h-9 md:h-10">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate flex-1">Course: {course.title}</h1>
            {/* List icon for mobile/tablet - opens course progress and content sheet */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsSheetOpen(true)} 
              className="flex-shrink-0 h-8 sm:h-9 md:h-10 lg:hidden"
            >
              <List className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable container on mobile, fixed on desktop */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 flex flex-col min-w-0 lg:w-[70%] order-1 lg:order-none min-h-0">
          <div className="flex-1 flex flex-col min-h-0 bg-card border-r border-border overflow-hidden rounded-none">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 rounded-none">
              {(() => {
                const lessonType = currentLesson.type || ((currentLesson as any).url ? "video" : "text")
                const hasVideo = !!(currentLesson as any).url
                const hasText = !!((currentLesson as any).html || (currentLesson as any).text)
                const isMixed = lessonType === "mixed" && hasVideo && hasText
                const hasQuiz = currentLesson.quiz_questions && currentLesson.quiz_questions.length > 0
                const hasResources = currentLesson.resources && currentLesson.resources.length > 0

                // Determine which tabs to show based on lesson type
                let tabs: Array<{ value: string; label: string }> = []
                
                if (isMixed) {
                  // Mixed lesson: Video | Text | Quiz (if available) | Resources (if available)
                  tabs.push({ value: "video", label: "Video" })
                  tabs.push({ value: "text", label: "Text" })
                } else if (hasVideo) {
                  // Video lesson: Video | Quiz (if available) | Resources (if available)
                  tabs.push({ value: "video", label: "Video" })
                } else if (hasText) {
                  // Text lesson: Text | Quiz (if available) | Resources (if available)
                  tabs.push({ value: "text", label: "Text" })
                }
                
                if (hasQuiz) {
                  tabs.push({ value: "quiz", label: "Quiz" })
                }
                
                if (hasResources) {
                  tabs.push({ value: "resources", label: "Resources" })
                }

                return (
                  <TabsList className="flex-shrink-0 w-full justify-start bg-muted p-0 h-10 sm:h-12 border-b border-border overflow-x-auto touch-pan-x">
                    {tabs.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0 text-xs sm:text-sm md:text-base"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                )
              })()}

              {(() => {
                const lessonType = currentLesson.type || ((currentLesson as any).url ? "video" : "text")
                const hasVideo = !!(currentLesson as any).url
                const hasText = !!((currentLesson as any).html || (currentLesson as any).text)
                const isMixed = lessonType === "mixed" && hasVideo && hasText

                return (
                  <>
                    {/* Video Tab - for video-only and mixed lessons */}
                    {(hasVideo && !isMixed) || isMixed ? (
                      <TabsContent value="video" className="flex-1 m-0 p-0 overflow-hidden min-h-0 rounded-none data-[state=active]:flex data-[state=active]:flex-col">
                        <div className="relative w-full h-full bg-black">
                          <VideoPlayer
                            key={`lesson-${currentLesson.id}-${currentLessonIndex}-video`}
                            lessonTitle={currentLesson.title}
                            onComplete={handleVideoComplete}
                            autoPlay={true}
                            isActive={activeTab === "video"}
                            videoUrl={(currentLesson as any).url}
                            courseId={id}
                            lessonId={currentLesson.id?.toString() || "lesson-" + String(currentLessonIndex)}
                          />
                        </div>
                      </TabsContent>
                    ) : null}

                    {/* Text Tab - for text-only and mixed lessons */}
                    {(hasText && !isMixed) || isMixed ? (
                      <TabsContent value="text" className="flex-1 m-0 p-0 overflow-hidden min-h-0 rounded-none data-[state=active]:flex data-[state=active]:flex-col">
                        {isMixed ? (
                          <TextContentWithTracking
                            content={(currentLesson as any).html || (currentLesson as any).text || ""}
                            lessonIndex={currentLessonIndex}
                            onTextViewed={handleTextComplete}
                            textViewedRefs={textViewedRefs}
                            textViewed={textViewed}
                          />
                        ) : (
                          <div className="w-full h-full overflow-y-auto">
                            <div className="p-3 sm:p-4 md:p-6">
                              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-foreground">
                                {currentLesson.title}
                              </h1>
                              <div 
                                className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: (currentLesson as any).html || (currentLesson as any).text
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    ) : null}
                  </>
                )
              })()}

              {/* Show quiz tab if: quiz is enabled OR (quiz has questions AND user has results) */}
              {currentLesson.quiz_questions && currentLesson.quiz_questions.length > 0 && 
               (currentLesson.quiz?.enabled !== false || (completedQuizzes && currentLesson.id && completedQuizzes[currentLesson.id])) && (
                <TabsContent value="quiz" className="flex-1 m-0 p-0 overflow-hidden min-h-0 rounded-none data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="w-full h-full overflow-y-auto">
                    <div className="p-3 sm:p-4 md:p-6">
                      <QuizComponent
                      quiz={{
                        questions: currentLesson.quiz_questions.map((q: any) => {
                          // Map API quiz question structure to component format
                          let options: string[] = []
                          let correctAnswer = 0

                          if (q.type === "multiple_choice") {
                            options = Array.isArray(q.options) ? q.options : (q.options_json ? JSON.parse(q.options_json) : [])
                            correctAnswer = typeof q.correct_answer === "number" ? q.correct_answer : 0
                          } else if (q.type === "fill_blank" || q.type === "fill-blank") {
                            options = Array.isArray(q.correct_answers) ? q.correct_answers : []
                            correctAnswer = 0
                          } else if (q.type === "short_answer" || q.type === "short-answer") {
                            options = Array.isArray(q.correct_keywords) ? q.correct_keywords : []
                            correctAnswer = 0
                          } else if (q.type === "essay") {
                            options = []
                            correctAnswer = -1
                          } else {
                            // Default fallback
                            options = Array.isArray(q.options) ? q.options : []
                            correctAnswer = typeof q.correct_answer === "number" ? q.correct_answer : 0
                          }

                          return {
                            question: q.question || q.text || "",
                            options: options,
                            correctAnswer: correctAnswer,
                            id: q.id?.toString() || "",
                            points: q.points || 1,
                            imageUrl: q.imageUrl || q.image_url,
                          }
                        }),
                            showResultsImmediately: currentLesson.quiz?.showCorrectAnswers || true,
                            // If quiz is disabled, prevent multiple attempts
                            allowMultipleAttempts: currentLesson.quiz?.enabled !== false && (currentLesson.quiz?.allowMultipleAttempts !== false),
                            showCorrectAnswers: currentLesson.quiz?.showCorrectAnswers || true,
                            maxAttempts: currentLesson.quiz?.maxAttempts || 3,
                            // Mark quiz as disabled if it's disabled (prevents retake)
                            disabled: currentLesson.quiz?.enabled === false,
                      }}
                      onComplete={handleQuizComplete}
                          onContinue={handleContinueFromQuiz}
                          onRetry={() => clearQuizData(currentLesson.id)}
                      minimumQuizScore={course?.settings?.minimumQuizScore || course?.settings?.certificate?.minimumQuizScore || 50}
                      courseId={id}
                      lessonId={currentLesson.id}
                          showResultsOnly={completedQuizzes && currentLesson.id ? (completedQuizzes[currentLesson.id] || false) : false}
                          prefilledAnswers={(quizAnswers && currentLesson.id && quizAnswers[currentLesson.id]) ? quizAnswers[currentLesson.id] : []}
                          initialScore={(quizScores && currentLesson.id && quizScores[currentLesson.id] !== undefined) ? quizScores[currentLesson.id] : undefined}
                          initialAttemptCount={(quizAttemptCounts && currentLesson.id && quizAttemptCounts[currentLesson.id] !== undefined) ? quizAttemptCounts[currentLesson.id] : undefined}
                          shuffleData={(shuffleData && currentLesson.id && shuffleData[currentLesson.id]) ? shuffleData[currentLesson.id] : undefined}
                    />
                    </div>
                  </div>
                </TabsContent>
              )}

              {currentLesson.resources && currentLesson.resources.length > 0 && (
                <TabsContent value="resources" className="flex-1 m-0 p-0 overflow-hidden min-h-0 rounded-none data-[state=active]:flex data-[state=active]:flex-col">
                  <div className="w-full h-full overflow-y-auto">
                    <div className="p-3 sm:p-4 md:p-6">
                      <ResourcesPanel 
                        resources={currentLesson.resources || []} 
                      />
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 p-3 sm:p-4 border-t border-border bg-background">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={handlePreviousLesson}
                  disabled={currentLessonIndex === 0}
                  className="text-foreground bg-background hover:bg-primary/10 hover:text-primary flex-1 sm:flex-initial h-10 sm:h-12 text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-6 lg:px-8"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>

                <Button
                  variant={allLessonsCompleted && !isCourseCompleted ? "default" : isCourseCompleted && currentLessonIndex === course.lessons.length - 1 ? "default" : "outline"}
                  onClick={async () => {
                    // If course is already completed and we're on the last lesson, go to summary
                    if (isCourseCompleted && currentLessonIndex === course.lessons.length - 1) {
                      router.push(`/learner/courses/${createCourseSlug(course?.title || "", parseInt(id))}/learn/summary`)
                      return
                    }

                    // If all lessons completed and course is not already completed, mark as completed
                    if (allLessonsCompleted && !isCourseCompleted) {
                      // Mark enrollment as completed before navigating
                      try {
                        logInfo("Complete Course clicked - updating enrollment status", { courseId: parseInt(id) })
                        const response = await fetch("/api/enrollments", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            courseId: parseInt(id),
                            status: "completed",
                          }),
                        })
                        
                        if (response.ok) {
                          // Refetch all related queries to update cache
                          await queryClient.refetchQueries({ queryKey: ["enrollments"] })
                          await queryClient.refetchQueries({ queryKey: ["progress", id] })
                          // Navigate to summary page
                          router.push(`/learner/courses/${createCourseSlug(course?.title || "", parseInt(id))}/learn/summary`)
                        } else {
                          const error = await handleApiError(response)
                          logError("Failed to update enrollment", error, {
                            component: "CourseLearningPage",
                            action: "completeCourse",
                            courseId: parseInt(id),
                          })
                          toast.error(formatErrorMessage(error, "Failed to mark course as completed. Please try again."))
                        }
                      } catch (error) {
                        logError("Error marking course as completed", error, {
                          component: "CourseLearningPage",
                          action: "completeCourse",
                          courseId: parseInt(id),
                        })
                        toast.error(formatErrorMessage(error, "An error occurred while completing the course. Please try again."))
                      }
                    } else {
                      handleNextLesson()
                    }
                  }}
                  disabled={
                    !allLessonsCompleted && !isCourseCompleted &&
                    activeTab === "resources" &&
                    currentLessonIndex === course.lessons.length - 1
                  }
                  className={`text-foreground flex-1 sm:flex-initial h-10 sm:h-12 text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-6 lg:px-8 ${
                    (allLessonsCompleted && !isCourseCompleted) || (isCourseCompleted && currentLessonIndex === course.lessons.length - 1)
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-background hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {isCourseCompleted && currentLessonIndex === course.lessons.length - 1 ? (
                    <>
                      View Summary <Eye className="ml-2 h-4 w-4" />
                    </>
                  ) : allLessonsCompleted && !isCourseCompleted ? (
                    <>
                      Complete Course <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Hidden on mobile/tablet, shown on desktop (lg+) */}
        <div className="hidden lg:flex flex-shrink-0 w-full lg:w-[30%] border-t lg:border-t-0 lg:border-l border-border bg-card order-2 lg:order-none flex flex-col min-h-0 lg:h-full">
          <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 md:p-5">
            <div className="mb-3 sm:mb-4 flex-shrink-0">
              <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-2 sm:mb-2.5">Course Progress</h3>
              <div className="space-y-2 sm:space-y-2.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1.5 sm:h-2 md:h-2.5" />
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {completedLessons.length} of {course.lessons.length} lessons completed
                </p>
              </div>
            </div>
            <div className="border-t pt-3 sm:pt-4 flex-1 flex flex-col min-h-0">
              <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-2.5 sm:mb-3 md:mb-4 flex-shrink-0">Course Content</h3>
              <ScrollArea className="flex-1 min-h-0 w-full">
                <div className="space-y-1.5 sm:space-y-2 md:space-y-2.5 pr-2 sm:pr-3">
                {course.lessons.map((lesson: any, index: number) => {
                  const isCompleted = completedLessons.includes(index)
                  const isCurrent = index === currentLessonIndex
                  const canAccess = canAccessLesson(index)
                  const isRequired = lesson?.settings?.isRequired ?? false

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (!canAccess) {
                          toast.error("You must complete all current lesson requirements like passing the quiz before moving to the next lesson")
                          return
                        }
                        const lesson = course.lessons[index]
                        setCurrentLessonIndex(index)
                        setActiveTab(getInitialTab(lesson))
                        setTimeLimitExceeded(false)
                      }}
                      disabled={!canAccess}
                      className={`w-full text-left p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg flex items-center justify-between transition-colors text-xs sm:text-sm border min-h-[44px] sm:min-h-[48px] ${
                        !canAccess
                          ? "opacity-50 cursor-not-allowed bg-muted border-border"
                          : isCurrent
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : isCompleted
                              ? "bg-muted/50 border-green-200 dark:border-green-800"
                              : "hover:bg-accent hover:text-accent-foreground border-border"
                      }`}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        {isCompleted ? (
                          <CheckCircle2 className="mr-2 sm:mr-2.5 md:mr-3 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0 text-green-500" />
                        ) : (() => {
                          const isVideoLesson = (lesson as any).url
                          const isTextLesson = (lesson as any).html || (lesson as any).text
                          const LessonIcon = isVideoLesson ? PlayCircle : isTextLesson ? FileText : PlayCircle
                          return <LessonIcon className={`mr-2 sm:mr-2.5 md:mr-3 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0 ${isCurrent ? "" : "text-muted-foreground"}`} />
                        })()}
                        <div className="flex-1 min-w-0">
                            <span className={`text-left break-words ${isCurrent ? "font-semibold" : ""}`}>
                              {index + 1}. {lesson.title}
                            </span>
                        </div>
                      </div>
                    </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Sheet - Course Progress and Content */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">Course Progress</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100vh-73px)]">
            <div className="p-4 border-b flex-shrink-0">
              <h3 className="text-sm font-semibold mb-2">Overall Progress</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {completedLessons.length} of {course.lessons.length} lessons completed
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-semibold mb-3 px-4 pt-4">Course Content</h3>
              <ScrollArea className="h-[calc(100vh-200px)] px-4">
                <div className="space-y-2 pb-4">
                  {course.lessons.map((lesson: any, index: number) => {
                    const isCompleted = completedLessons.includes(index)
                    const isCurrent = index === currentLessonIndex
                    const canAccess = canAccessLesson(index)
                    const isVideoLesson = (lesson as any).url
                    const isTextLesson = (lesson as any).html || (lesson as any).text
                    const LessonIcon = isVideoLesson ? PlayCircle : isTextLesson ? FileText : BookOpen

                    return (
                      <Button
                        key={lesson.id || index}
                        variant={isCurrent ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start h-auto py-2 px-3 text-left",
                          isCompleted && "text-muted-foreground",
                          !canAccess && "opacity-60 cursor-not-allowed"
                        )}
                        onClick={() => {
                          if (!canAccess) {
                            toast.error("You must complete all current lesson requirements like passing the quiz before moving to the next lesson")
                            return
                          }
                          setCurrentLessonIndex(index)
                          setActiveTab("video")
                          setTimeLimitExceeded(false)
                          setIsSheetOpen(false)
                        }}
                        disabled={!canAccess}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                          ) : (
                            <LessonIcon className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate flex-1">{lesson.title}</span>
                        </div>
                      </Button>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
