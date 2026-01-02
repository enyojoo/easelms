"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { extractIdFromSlug, createCourseSlug } from "@/lib/slug"
import { useClientAuthState } from "@/utils/client-auth"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, ArrowLeft, Clock, PlayCircle, FileText, List } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import VideoPlayer from "./components/VideoPlayer"
import QuizComponent from "./components/QuizComponent"
import ResourcesPanel from "./components/ResourcesPanel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCourse, useEnrollments, useProgress, useQuizResults, useRealtimeProgress, useRealtimeQuizResults, useSaveProgress } from "@/lib/react-query/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/use-toast"

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
  const [lessonStartTime, setLessonStartTime] = useState<number | null>(null)
  const [videoProgress, setVideoProgress] = useState<{ [key: number]: number }>({})
  const [timeLimitExceeded, setTimeLimitExceeded] = useState(false)
  const progressSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Use React Query hooks for data fetching
  const { data: courseData, isPending: coursePending, error: courseError } = useCourse(id)
  const { data: enrollmentsData } = useEnrollments()
  const { data: progressData } = useProgress(id)
  const { data: quizResultsData } = useQuizResults(id)
  const saveProgressMutation = useSaveProgress()
  const queryClient = useQueryClient()
  
  // Set up real-time subscriptions for progress and quiz results
  useRealtimeProgress(id, user?.id)
  useRealtimeQuizResults(id, user?.id)

  const course = courseData?.course

  // Calculate progress from React Query data (matching learn page logic)
  const { completedLessons, progress } = useMemo(() => {
    if (!course || !progressData?.progress) {
      return { completedLessons: [], progress: 0 }
    }

    const progressList = progressData.progress
    const completed: number[] = []
    const videoProg: { [key: number]: number } = {}

    progressList.forEach((p: any) => {
      if (p.completed) {
        const lessonIndex = course.lessons?.findIndex((l: any) => l.id === p.lesson_id) ?? -1
        if (lessonIndex >= 0) {
          completed.push(lessonIndex)
        }
      }
      if (p.video_progress !== undefined && p.video_progress !== null) {
        const lessonIndex = course.lessons?.findIndex((l: any) => l.id === p.lesson_id) ?? -1
        if (lessonIndex >= 0) {
          videoProg[lessonIndex] = p.video_progress
        }
      }
    })

    // Update video progress state
    if (Object.keys(videoProg).length > 0) {
      setVideoProgress((prev) => ({ ...prev, ...videoProg }))
    }

    const progressPercent = course.lessons ? (completed.length / course.lessons.length) * 100 : 0
    const allCompleted = course.lessons ? completed.length === course.lessons.length : false
    setAllLessonsCompleted(allCompleted)

    return { completedLessons: completed, progress: progressPercent }
  }, [course, progressData])

  // Set initial lesson index from query parameter or find first incomplete lesson
  useEffect(() => {
    if (!course || !progressData?.progress) return

    // If lessonIndex is provided in query params, use it
    if (lessonIndexParam !== null) {
      const index = parseInt(lessonIndexParam, 10)
      if (!isNaN(index) && index >= 0 && index < (course.lessons?.length || 0)) {
        setCurrentLessonIndex(index)
        // Reset active tab to video when changing lesson
        setActiveTab("video")
        return
      }
    }

    // Otherwise, find the first incomplete lesson
    if (completedLessons.length > 0 && course.lessons) {
      for (let i = 0; i < course.lessons.length; i++) {
        if (!completedLessons.includes(i)) {
          setCurrentLessonIndex(i)
          setActiveTab("video")
          return
        }
      }
      // All lessons completed, go to last lesson
      if (course.lessons.length > 0) {
        setCurrentLessonIndex(course.lessons.length - 1)
        setActiveTab("video")
      }
    }
  }, [course, progressData, completedLessons, lessonIndexParam])

  // Cleanup: Pause all videos when lesson index changes
  useEffect(() => {
    // Pause all video elements on the page when lesson changes
    const allVideos = document.querySelectorAll('video')
    allVideos.forEach((video) => {
      if (!video.paused) {
        video.pause()
        video.currentTime = 0
      }
    })
    
  }, [currentLessonIndex])

  // Ensure video continues playing when screen resolution changes
  useEffect(() => {
    const handleResize = () => {
      // Don't pause video on resize - let it continue playing
      // The Intersection Observer will handle visibility changes
      const video = document.querySelector('video')
      if (video && !video.paused && activeTab === "video") {
        // Video is playing and we're on video tab - ensure it stays playing
        // Only pause if it's actually out of view (handled by Intersection Observer)
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [activeTab])

  // Process quiz data from React Query
  const { completedQuizzes, quizScores, quizAnswers } = useMemo(() => {
    const completedQuizzesMap: { [lessonId: number]: boolean } = {}
    const answersMap: { [lessonId: number]: number[] } = {}
    const scoresMap: { [lessonId: number]: number } = {}

    if (!quizResultsData?.results || !progressData?.progress) {
      return { completedQuizzes: completedQuizzesMap, quizScores: scoresMap, quizAnswers: answersMap }
    }

    // Process quiz results (answers)
    const resultsByLesson: { [lessonId: number]: any[] } = {}
    quizResultsData.results.forEach((result: any) => {
      const lessonId = result.lesson_id
      if (!resultsByLesson[lessonId]) {
        resultsByLesson[lessonId] = []
      }
      resultsByLesson[lessonId].push(result)
    })

    Object.entries(resultsByLesson).forEach(([lessonId, results]: [string, any]) => {
      const lessonIdNum = parseInt(lessonId)
      completedQuizzesMap[lessonIdNum] = true
      answersMap[lessonIdNum] = results.map((r: any) => {
        const answer = r.user_answer
        return typeof answer === 'string' ? parseInt(answer) : answer
      }).filter((a: any) => a !== null && !isNaN(a))
    })

    // Process progress data (scores)
    progressData.progress.forEach((p: any) => {
      if (p.lesson_id && p.quiz_score !== null && p.quiz_score !== undefined) {
        scoresMap[p.lesson_id] = p.quiz_score
      }
    })

    return { completedQuizzes: completedQuizzesMap, quizScores: scoresMap, quizAnswers: answersMap }
  }, [quizResultsData, progressData])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/learner/login")
    }
  }, [authLoading, user, router])

  // Check enrollment and redirect if not enrolled
  // Handle payment=success by invalidating cache and waiting for enrollment
  useEffect(() => {
    if (!id || !course) return

    const courseId = parseInt(id)

    // If payment was successful, invalidate enrollments cache and wait for it to update
    if (paymentSuccess) {
      // Invalidate enrollments cache to force refetch
      queryClient.invalidateQueries({ queryKey: ["enrollments"] })
      
      // Refetch enrollments immediately
      queryClient.refetchQueries({ queryKey: ["enrollments"] })
      
      // Wait a bit for the cache to update, then check enrollment
      const checkEnrollment = setTimeout(() => {
        // Check if enrollment is now available
        const currentEnrollments = queryClient.getQueryData<{ enrollments: any[] }>(["enrollments"])
        const enrollment = currentEnrollments?.enrollments?.find((e: any) => e.course_id === courseId)
        
        if (enrollment) {
          // Enrollment found, remove query param
          router.replace(`/learner/courses/${createCourseSlug(course.title, courseId)}/learn`)
        }
      }, 1000) // Wait 1 second for enrollment to be available

      return () => clearTimeout(checkEnrollment)
    }

    // Normal enrollment check (only if we have enrollment data)
    if (!enrollmentsData?.enrollments) return

    const enrollment = enrollmentsData.enrollments.find((e: any) => e.course_id === courseId)
    
    if (!enrollment) {
      // Only redirect if payment was not successful (to avoid redirect loop)
      if (!paymentSuccess) {
        router.push(`/learner/courses/${createCourseSlug(course.title, courseId)}`)
      }
    }
  }, [id, enrollmentsData, course, router, paymentSuccess, queryClient])

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
        // Ensure cache is invalidated and refetched to sync across devices
        queryClient.invalidateQueries({ queryKey: ["progress", id] })
        queryClient.invalidateQueries({ queryKey: ["progress", "all"] })
        queryClient.refetchQueries({ queryKey: ["progress", id] })
      } catch (error) {
        console.error("Error saving progress:", error)
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


  const handleLessonComplete = async () => {
    if (!course) return

    const lesson = course.lessons[currentLessonIndex]
    if (!lesson) return

    // Check if lesson has a quiz
    const hasQuiz = lesson.quiz_questions && lesson.quiz_questions.length > 0
    
    // If there's a quiz, explicitly save progress with completed: false
    // and navigate to quiz. Lesson will only be marked as completed when quiz is passed.
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
        console.error("Error saving progress:", error)
      }
      setActiveTab("quiz")
      return
    }

    // Only mark as completed if there's no quiz
    // If already completed, just navigate
    if (!completedLessons.includes(currentLessonIndex)) {
      // Save progress to API - progress will update automatically from React Query cache
      await saveProgress(lesson.id, true)
    }
    
    // Auto-advance to resources or next lesson
    if (lesson.resources && lesson.resources.length > 0) {
      setActiveTab("resources")
    } else if (currentLessonIndex < course.lessons.length - 1) {
      // If no resources, go to next lesson
      const nextIndex = currentLessonIndex + 1
      if (canAccessLesson(nextIndex)) {
        setCurrentLessonIndex(nextIndex)
        setActiveTab("video")
      }
    } else {
      // All lessons completed, go to summary
      router.push(`/learner/courses/${createCourseSlug(course?.title || "", parseInt(id))}/learn/summary`)
    }
  }

  const clearQuizData = (lessonId: number) => {
    // Invalidate quiz results cache to refetch fresh data when retaking
    // This will cause the quiz data to be recalculated from React Query
    queryClient.invalidateQueries({ queryKey: ["quizResults", id] })
  }

  const handleVideoProgressUpdate = async (progressPercentage: number) => {
    setVideoProgress((prev) => ({
      ...prev,
      [currentLessonIndex]: progressPercentage,
    }))
  }

  const handleQuizComplete = async (answers?: number[], questions?: any[], attemptCount?: number) => {
    if (!course || !id) return

    const lesson = course.lessons[currentLessonIndex]
    if (!lesson) return

    // Calculate quiz score to check if passed
    let quizPassed = false
    let scorePercentage = 0
    
    if (answers && answers.length > 0 && questions && questions.length > 0) {
      let correctCount = 0
      
      // Count correct answers using the questions (which match the order of answers)
      console.log("Score calculation - Answers and questions:")
      for (let i = 0; i < answers.length; i++) {
        const question = questions[i]
        const userAnswer = answers[i]
        const isCorrect = question && userAnswer === question.correctAnswer
        
        console.log(`Q${i+1}: User answer=${userAnswer}, Correct answer=${question?.correctAnswer}, Match=${isCorrect}`)
        
        if (isCorrect) {
          correctCount++
        }
      }
      
      scorePercentage = (correctCount / answers.length) * 100
      const minimumScore = course?.settings?.minimumQuizScore || 50
      quizPassed = scorePercentage >= minimumScore

      console.log(`Quiz score: ${scorePercentage.toFixed(0)}% (${correctCount}/${answers.length}), Minimum: ${minimumScore}%, Passed: ${quizPassed}`)
    } else {
      console.warn("Cannot calculate score - missing answers or questions", { answers, questions })
    }

    // Quiz results are saved by QuizComponent via API
    // Invalidate React Query cache to refetch updated quiz results
    queryClient.invalidateQueries({ queryKey: ["quizResults", id] })

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

      console.log("📤 Saving quiz progress to database:", progressPayload)
      // Save immediately (no debounce) for quiz completion
      await saveProgressMutation.mutateAsync(progressPayload)
      console.log("✅ Quiz progress saved successfully")
      
      // Invalidate caches to update UI
      queryClient.invalidateQueries({ queryKey: ["progress", id] })
      queryClient.invalidateQueries({ queryKey: ["quizResults", id] })
    } catch (error) {
      console.error("❌ Error saving quiz progress:", error)
    }

    // Mark lesson as completed ONLY if quiz was passed
    console.log(`Checking lesson completion: quizPassed=${quizPassed}, currentLessonIndex=${currentLessonIndex}`)
    
    if (quizPassed && !completedLessons.includes(currentLessonIndex)) {
      console.log("✅ Lesson marked as completed in course content", { lessonId: lesson.id, currentLessonIndex })
    } else if (!quizPassed) {
      console.log("❌ Quiz not passed - lesson will not be marked as completed")
    } else {
      console.log("⏭️ Lesson already marked as completed")
    }
    
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
          toast({
            title: "Lesson Locked",
            description: "You must complete all current lesson requirments like passing the quiz before moving to the next lesson",
            variant: "destructive",
          })
          return
        }
        setCurrentLessonIndex(nextIndex)
        setActiveTab("video")
        setTimeLimitExceeded(false)
      } else {
      // All lessons completed, go to summary
        router.push(`/learner/courses/${createCourseSlug(course?.title || "", parseInt(id))}/learn/summary`)
    }
  }

  const handleNextLesson = () => {
    if (activeTab === "video") {
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
            toast({
              title: "Lesson Locked",
              description: "You must complete all current lesson requirments like passing the quiz before moving to the next lesson",
              variant: "destructive",
            })
            return
          }
          setCurrentLessonIndex(nextIndex)
          setActiveTab("video")
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
            toast({
              title: "Lesson Locked",
              description: "You must complete all current lesson requirments like passing the quiz before moving to the next lesson",
              variant: "destructive",
            })
            return
          }
          setCurrentLessonIndex(nextIndex)
          setActiveTab("video")
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
          toast({
            title: "Lesson Locked",
            description: "You must complete all current lesson requirments like passing the quiz before moving to the next lesson",
            variant: "destructive",
          })
          return
        }
        setCurrentLessonIndex(nextIndex)
        setActiveTab("video")
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
        toast({
          title: "Lesson Locked",
          description: "You must complete all current lesson requirments like passing the quiz before moving to the next lesson",
          variant: "destructive",
        })
        return
      }
      setCurrentLessonIndex(prevIndex)
      setActiveTab("video")
      setTimeLimitExceeded(false)
    }
  }

  // Show skeleton ONLY on true initial load (no cached data exists)
  const hasData = !!course
  const showSkeleton = (authLoading || !user || coursePending) && !hasData

  // Show error if course not found
  if (courseError || (!coursePending && !course)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">{courseError?.message || "Course not found"}</p>
          <Button onClick={() => router.push("/learner/courses")}>Back to Courses</Button>
        </div>
      </div>
    )
  }

  // Don't render until course is loaded
  if (!course || showSkeleton) {
    return null
  }

  const currentLesson = course.lessons[currentLessonIndex]
  if (!currentLesson) {
    console.error("Learn page: No current lesson found", { 
      currentLessonIndex,
      lessonsCount: course.lessons.length,
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
    <div className="fixed inset-0 lg:left-64 lg:top-16 lg:right-0 lg:bottom-0 flex flex-col overflow-hidden bg-background z-50 lg:z-40 touch-pan-y">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="max-w-[1800px] mx-auto flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex-shrink-0 h-8 sm:h-9 md:h-10">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate flex-1 min-w-0">Course: {course.title}</h1>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 sm:h-9 md:h-10">
                  <List className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[90vw] sm:w-[400px] p-0 overflow-hidden">
                <SheetHeader className="p-4 border-b text-left">
                  <SheetTitle className="text-left">Course Progress</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-[calc(100vh-73px)] overflow-hidden">
                  <div className="p-4 border-b flex-shrink-0">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className="font-semibold">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {completedLessons.length} of {course.lessons.length} lessons completed
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="p-4">
                      <h3 className="text-base font-semibold mb-3">Course Content</h3>
                    </div>
                    <ScrollArea className="flex-1 h-full px-4">
                      <div className="space-y-2 pb-4">
                        {course.lessons.map((lesson: any, index: number) => {
                          const isCompleted = completedLessons.includes(index)
                          const isCurrent = index === currentLessonIndex
                          const canAccess = canAccessLesson(index)
                          const isVideoLesson = (lesson as any).url
                          const isTextLesson = (lesson as any).html || (lesson as any).text
                          const LessonIcon = isVideoLesson ? PlayCircle : isTextLesson ? FileText : PlayCircle

                          return (
                            <button
                              key={index}
                              onClick={() => {
                                if (!canAccess) {
                                  toast({
                                    title: "Lesson Locked",
                                    description: "You must complete all current lesson requirments like passing the quiz before moving to the next lesson",
                                    variant: "destructive",
                                  })
                                  return
                                }
                                setCurrentLessonIndex(index)
                                setActiveTab("video")
                                setTimeLimitExceeded(false)
                                setIsSheetOpen(false)
                              }}
                              disabled={!canAccess}
                              className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors text-sm border min-h-[48px] ${
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
                                  <CheckCircle2 className="mr-3 h-4 w-4 flex-shrink-0 text-green-500" />
                                ) : (
                                  <LessonIcon className={`mr-3 h-4 w-4 flex-shrink-0 ${isCurrent ? "" : "text-muted-foreground"}`} />
                                )}
                                <span className={`text-left break-words ${isCurrent ? "font-semibold" : ""}`}>
                                  {index + 1}. {lesson.title}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content - Full width on all screens */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 bg-card border-r border-border overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="flex-shrink-0 w-full justify-start bg-muted p-0 h-10 sm:h-12 border-b border-border overflow-x-auto touch-pan-x">
                <TabsTrigger
                  value="video"
                  className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0 text-xs sm:text-sm md:text-base"
                >
                    Lesson
                </TabsTrigger>
                {currentLesson.quiz_questions && currentLesson.quiz_questions.length > 0 && (
                  <TabsTrigger
                    value="quiz"
                    className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0 text-xs sm:text-sm md:text-base"
                  >
                    Quiz
                  </TabsTrigger>
                )}
                {currentLesson.resources && currentLesson.resources.length > 0 && (
                  <TabsTrigger
                    value="resources"
                    className="rounded-none h-10 sm:h-12 px-3 sm:px-4 md:px-6 lg:px-8 flex-shrink-0 text-xs sm:text-sm md:text-base"
                  >
                    Resources
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="video" className="flex-1 m-0 p-0 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
                {(currentLesson as any).url ? (
                  <div className="relative w-full h-full bg-black flex items-center justify-center min-h-0">
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoPlayer
                        key={`lesson-${currentLesson.id}-${currentLessonIndex}`}
                        lessonTitle={currentLesson.title}
                        onComplete={handleLessonComplete}
                        autoPlay={true}
                        isActive={activeTab === "video"}
                        videoUrl={(currentLesson as any).url}
                        courseId={id}
                        lessonId={currentLesson.id?.toString() || "lesson-" + String(currentLessonIndex)}
                        videoProgression={(currentLesson.settings && typeof currentLesson.settings === "object" ? (currentLesson.settings as any).videoProgression : false) ?? false}
                        onProgressUpdate={handleVideoProgressUpdate}
                      />
                    </div>
                  </div>
                ) : ((currentLesson as any).html || (currentLesson as any).text) ? (
                  <ScrollArea className="w-full h-full flex-1 min-h-0">
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
                  </ScrollArea>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <p className="text-lg font-semibold mb-2">No content available</p>
                      <p className="text-sm">This lesson doesn't have any content. Please check back later.</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {currentLesson.quiz_questions && currentLesson.quiz_questions.length > 0 && (
                <TabsContent value="quiz" className="flex-1 m-0 p-0 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <ScrollArea className="w-full h-full flex-1 min-h-0">
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
                          }
                        }),
                            showResultsImmediately: currentLesson.quiz?.showCorrectAnswers || true,
                            allowMultipleAttempts: currentLesson.quiz?.allowMultipleAttempts || true,
                            showCorrectAnswers: currentLesson.quiz?.showCorrectAnswers || true,
                            maxAttempts: currentLesson.quiz?.maxAttempts || 3,
                      }}
                      onComplete={handleQuizComplete}
                          onContinue={handleContinueFromQuiz}
                          onRetry={() => clearQuizData(currentLesson.id)}
                      minimumQuizScore={course?.settings?.minimumQuizScore || course?.settings?.certificate?.minimumQuizScore || 50}
                      courseId={id}
                      lessonId={currentLesson.id}
                          showResultsOnly={completedQuizzes[currentLesson.id]}
                          prefilledAnswers={quizAnswers[currentLesson.id] || []}
                          initialScore={quizScores[currentLesson.id]}
                    />
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {currentLesson.resources && currentLesson.resources.length > 0 && (
                <TabsContent value="resources" className="flex-1 m-0 p-0 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
                  <ScrollArea className="w-full h-full flex-1 min-h-0">
                    <div className="p-3 sm:p-4 md:p-6">
                      <ResourcesPanel 
                        resources={currentLesson.resources || []} 
                      />
                    </div>
                  </ScrollArea>
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
                  className="flex-1 text-foreground bg-background hover:bg-primary/10 hover:text-primary h-10 sm:h-12 text-xs sm:text-sm md:text-base"
                  size="sm"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>

                <Button
                  variant={allLessonsCompleted ? "default" : "outline"}
                  onClick={
                    allLessonsCompleted ? () => router.push(`/learner/courses/${createCourseSlug(course?.title || "", parseInt(id))}/learn/summary`) : handleNextLesson
                  }
                  disabled={
                    !allLessonsCompleted &&
                    activeTab === "resources" &&
                    currentLessonIndex === course.lessons.length - 1
                  }
                  className={`flex-1 text-foreground h-10 sm:h-12 text-xs sm:text-sm md:text-base ${
                    allLessonsCompleted
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-background hover:bg-primary/10 hover:text-primary"
                  }`}
                  size="sm"
                >
                  {allLessonsCompleted ? (
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
      </div>
    </div>
  )
}
