"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { extractIdFromSlug, createCourseSlug } from "@/lib/slug"
import { useClientAuthState } from "@/utils/client-auth"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, ArrowLeft, Clock, PlayCircle } from "lucide-react"
import CourseLearningSkeleton from "@/components/CourseLearningSkeleton"
import VideoPlayer from "./components/VideoPlayer"
import QuizComponent from "./components/QuizComponent"
import ResourcesPanel from "./components/ResourcesPanel"
import { ScrollArea } from "@/components/ui/scroll-area"

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
    vimeoVideoId?: string
    html?: string
    text?: string
    estimatedDuration?: number
  }>
}

export default function CourseLearningPage() {
  const router = useRouter()
  const params = useParams()
  const slugOrId = params.id as string
  const id = extractIdFromSlug(slugOrId) // Extract actual ID from slug if present
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [course, setCourse] = useState<Course | null>(null)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("video")
  const [completedLessons, setCompletedLessons] = useState<number[]>([])
  const [allLessonsCompleted, setAllLessonsCompleted] = useState(false)
  const [lessonStartTime, setLessonStartTime] = useState<number | null>(null)
  const [videoProgress, setVideoProgress] = useState<{ [key: number]: number }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [timeLimitExceeded, setTimeLimitExceeded] = useState(false)
  const [completedQuizzes, setCompletedQuizzes] = useState<{ [lessonId: number]: boolean }>({})
  const [quizScores, setQuizScores] = useState<{ [lessonId: number]: number }>({})
  const [quizAnswers, setQuizAnswers] = useState<{ [lessonId: number]: number[] }>({})
  const progressSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const quizDataLoadedRef = useRef<boolean>(false)

  // Load quiz completion status from Supabase (only once per course)
  useEffect(() => {
        const loadQuizData = async () => {
          if (!mounted || !course || !id || quizDataLoadedRef.current) return

          try {
            // Fetch quiz results (answers)
            const quizResultsResponse = await fetch(`/api/courses/${id}/quiz-results`)
            let quizResultsData: any = { results: [] }
            if (quizResultsResponse.ok) {
              quizResultsData = await quizResultsResponse.json()
            }

            // Fetch lesson progress (including quiz scores)
            const progressResponse = await fetch(`/api/progress?courseId=${id}`)
            let progressData: any = { progress: [] }
            if (progressResponse.ok) {
              progressData = await progressResponse.json()
            }

            const completedQuizzesMap: { [lessonId: number]: boolean } = {}
            const answersMap: { [lessonId: number]: number[] } = {}
            const scoresMap: { [lessonId: number]: number } = {}

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

            setCompletedQuizzes(completedQuizzesMap)
            setQuizAnswers(answersMap)
            setQuizScores(scoresMap)
            quizDataLoadedRef.current = true

            console.log("Loaded quiz data from Supabase:", { completedQuizzesMap, answersMap, scoresMap, rawQuizResults: quizResultsData.results, rawProgress: progressData.progress })
          } catch (e) {
            console.warn("Could not load quiz data from Supabase:", e)
          }
        }


    loadQuizData()
  }, [mounted, course, id])

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log("Learn page: User not authenticated, redirecting to login")
      router.push("/auth/learner/login")
    }
  }, [authLoading, user, router])

  // Fetch course data and check enrollment
  useEffect(() => {
    const fetchCourseData = async () => {
      // Don't fetch until auth is loaded and user is available
      if (authLoading || !user) {
        console.log("Learn page: Auth still loading or no user")
        return
      }

      if (!id || !mounted) {
        console.log("Learn page: No course ID or not mounted")
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch course data
        console.log("Learn page: Fetching course data for ID:", id)
        const courseResponse = await fetch(`/api/courses/${id}`)
        if (!courseResponse.ok) {
          console.error("Learn page: Course fetch failed", { status: courseResponse.status })
          if (courseResponse.status === 404) {
            router.push("/learner/courses")
            return
          }
          throw new Error("Failed to fetch course")
        }
        const courseData = await courseResponse.json()
        console.log("Learn page: Course loaded:", courseData.course.title)
        console.log("Learn page: First lesson data:", courseData.course.lessons?.[0])
        setCourse(courseData.course)

        // Check enrollment
        console.log("Learn page: Checking enrollment for course", id)
        const enrollmentsResponse = await fetch("/api/enrollments")
        if (enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json()
          console.log("Learn page: Enrollments fetched:", enrollmentsData)
          const enrollments = enrollmentsData.enrollments || []
          const enrollment = enrollments.find((e: any) => e.course_id === parseInt(id))
          console.log("Learn page: Enrollment check result:", { found: !!enrollment, courseId: parseInt(id) })
          if (!enrollment) {
            console.log("Learn page: User not enrolled, redirecting to course page")
            router.push(`/learner/courses/${createCourseSlug(courseData.course.title, parseInt(id))}`)
            return
          }
        } else {
          console.error("Learn page: Enrollments fetch failed", { status: enrollmentsResponse.status })
          router.push(`/learner/courses/${createCourseSlug(courseData.course.title, parseInt(id))}`)
          return
        }

        // Fetch progress
        console.log("Learn page: Fetching progress for course", id)
        const progressResponse = await fetch(`/api/progress?courseId=${id}`)
        if (progressResponse.ok) {
          const progressData = await progressResponse.json()
          const progressList = progressData.progress || []
          console.log("Learn page: Progress data fetched:", progressList)
          
          // Map progress to completed lessons and video progress
          const completed: number[] = []
          const videoProg: { [key: number]: number } = {}
          
          progressList.forEach((p: any) => {
            if (p.completed) {
              const lessonIndex = courseData.course.lessons?.findIndex((l: any) => l.id === p.lesson_id) ?? -1
              if (lessonIndex >= 0) {
                completed.push(lessonIndex)
              }
            }
            if (p.video_progress !== undefined && p.video_progress !== null) {
              const lessonIndex = courseData.course.lessons?.findIndex((l: any) => l.id === p.lesson_id) ?? -1
              if (lessonIndex >= 0) {
                videoProg[lessonIndex] = p.video_progress
              }
            }
          })
          
          setCompletedLessons(completed)
          setVideoProgress(videoProg)
          
          if (courseData.course.lessons) {
            const progressPercent = (completed.length / courseData.course.lessons.length) * 100
            setProgress(progressPercent)
            setAllLessonsCompleted(completed.length === courseData.course.lessons.length)
            console.log("Learn page: Progress calculated:", { progressPercent, completed: completed.length, total: courseData.course.lessons.length })
          }
        } else {
          console.warn("Learn page: Progress fetch failed or returned empty, continuing with default state")
        }
      } catch (err: any) {
        console.error("Learn page: Error fetching course data:", err)
        setError(err.message || "Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [id, mounted, authLoading, user, router])

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
        const lesson = course.lessons[currentLessonIndex]
        if (!lesson) return

        const progressPayload: any = {
          course_id: parseInt(id),
          lesson_id: lesson.id,
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null, // Set timestamp only if completed
          quiz_score: quizPassed && scorePercentage !== undefined ? Math.round(scorePercentage) : null, // Only save score if quiz passed, rounded to integer
          quiz_attempts: quizAttempts !== undefined ? quizAttempts : null, // Include quiz attempts
        }

        await fetch("/api/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(progressPayload),
        })
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
    if (!course || completedLessons.includes(currentLessonIndex)) {
      const currentLesson = course.lessons[currentLessonIndex]
      if (currentLesson?.quiz_questions && currentLesson.quiz_questions.length > 0) {
        setActiveTab("quiz")
      } else if (currentLesson?.resources && currentLesson.resources.length > 0) {
        setActiveTab("resources")
      } else if (currentLessonIndex < course.lessons.length - 1) {
        // If no quiz or resources, go to next lesson
        const nextIndex = currentLessonIndex + 1
        if (canAccessLesson(nextIndex)) {
          setCurrentLessonIndex(nextIndex)
          setActiveTab("video")
        }
      } else {
        // All lessons completed, go to summary
        router.push(`/learner/courses/${createCourseSlug(course?.title || "", parseInt(id))}/learn/summary`)
      }
      return
    }

    const lesson = course.lessons[currentLessonIndex]
    if (!lesson) return

    const newCompletedLessons = [...completedLessons, currentLessonIndex]
    setCompletedLessons(newCompletedLessons)
    const newProgress = (newCompletedLessons.length / course.lessons.length) * 100
    setProgress(newProgress)
    if (newCompletedLessons.length === course.lessons.length) {
      setAllLessonsCompleted(true)
    }

    // Save progress to API
    await saveProgress(lesson.id, true)
    
    // Auto-advance to quiz if present, otherwise to resources, or next lesson
    const currentLesson = course.lessons[currentLessonIndex]
    if (currentLesson?.quiz_questions && currentLesson.quiz_questions.length > 0) {
      setActiveTab("quiz")
    } else if (currentLesson?.resources && currentLesson.resources.length > 0) {
      setActiveTab("resources")
    } else if (currentLessonIndex < course.lessons.length - 1) {
      // If no quiz or resources, go to next lesson
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
    // Clear quiz data for a specific lesson to prevent flickering when retaking
    setCompletedQuizzes((prev) => {
      const updated = { ...prev }
      delete updated[lessonId]
      return updated
    })
    setQuizAnswers((prev) => {
      const updated = { ...prev }
      delete updated[lessonId]
      return updated
    })
  }

  const handleVideoProgressUpdate = async (progressPercentage: number) => {
    setVideoProgress((prev) => ({
      ...prev,
      [currentLessonIndex]: progressPercentage,
    }))
  }

  const handleQuizComplete = async (answers?: number[], shuffledQuestions?: any[], attemptCount?: number) => {
    if (!course || !id) return

    const lesson = course.lessons[currentLessonIndex]
    if (!lesson) return

    // Calculate quiz score to check if passed
    let quizPassed = false
    let scorePercentage = 0
    
    if (answers && answers.length > 0 && shuffledQuestions && shuffledQuestions.length > 0) {
      let correctCount = 0
      
      // Count correct answers using the shuffled questions (which match the order of answers)
      console.log("Score calculation - Answers and questions:")
      for (let i = 0; i < answers.length; i++) {
        const question = shuffledQuestions[i]
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
      
      // Set quiz score
      setQuizScores((prev) => ({
        ...prev,
        [lesson.id]: scorePercentage,
      }))

      console.log(`Quiz score: ${scorePercentage.toFixed(0)}% (${correctCount}/${answers.length}), Minimum: ${minimumScore}%, Passed: ${quizPassed}`)
    } else {
      console.warn("Cannot calculate score - missing answers or shuffledQuestions", { answers, shuffledQuestions })
    }

    // Mark quiz as completed and store answers
    const updatedCompletedQuizzes = {
      ...completedQuizzes,
      [lesson.id]: true,
    }
    
    const updatedAnswers = answers ? {
      ...quizAnswers,
      [lesson.id]: answers,
    } : quizAnswers

    setCompletedQuizzes(updatedCompletedQuizzes)
    setQuizAnswers(updatedAnswers)
    
    // Save to Supabase
    try {
      if (answers && answers.length > 0) {
        const response = await fetch(`/api/courses/${id}/quiz-results`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            answers: answers.map((answer, index) => {
              const question = currentLesson.quiz_questions?.[index]
              return {
                questionId: question?.id || `q-${index}`,
                userAnswer: answer,
              }
            }),
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log("Quiz results saved to Supabase:", data)
          
          // Reset the loaded ref so we reload fresh data from Supabase
          quizDataLoadedRef.current = false
          
          // Reload quiz data from Supabase to show updated results
          const reloadResponse = await fetch(`/api/courses/${id}/quiz-results`)
          if (reloadResponse.ok) {
            const reloadedData = await reloadResponse.json()
            if (reloadedData.results && Array.isArray(reloadedData.results)) {
              // Parse Supabase results and organize by lesson
              const completedQuizzesMap: { [lessonId: number]: boolean } = {}
              const answersMap: { [lessonId: number]: number[] } = {}

              // Group results by lesson
              const resultsByLesson: { [lessonId: number]: any[] } = {}
              reloadedData.results.forEach((result: any) => {
                const lessonId = result.lesson_id
                if (!resultsByLesson[lessonId]) {
                  resultsByLesson[lessonId] = []
                }
                resultsByLesson[lessonId].push(result)
              })

              // Convert to answers array format
              Object.entries(resultsByLesson).forEach(([lessonId, results]: [string, any]) => {
                const lessonIdNum = parseInt(lessonId)
                completedQuizzesMap[lessonIdNum] = true
                answersMap[lessonIdNum] = results.map((r: any) => {
                  const answer = r.user_answer
                  return typeof answer === 'string' ? parseInt(answer) : answer
                }).filter((a: any) => a !== null && !isNaN(a))
              })

              setCompletedQuizzes(completedQuizzesMap)
              setQuizAnswers(answersMap)
              quizDataLoadedRef.current = true
              
              console.log("Reloaded quiz data from Supabase after submission")
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.warn("Quiz results save warning:", errorData.error || "Could not save to Supabase")
        }
      }
    } catch (e) {
      console.error("Failed to save quiz completion to Supabase:", e)
    }

    // Mark lesson as completed ONLY if quiz was passed
    console.log(`Checking lesson completion: quizPassed=${quizPassed}, currentLessonIndex=${currentLessonIndex}, completedLessons=${completedLessons}`)
    
    if (quizPassed && !completedLessons.includes(currentLessonIndex)) {
      const newCompletedLessons = [...completedLessons, currentLessonIndex]
      setCompletedLessons(newCompletedLessons)
      const newProgress = (newCompletedLessons.length / course.lessons.length) * 100
      setProgress(newProgress)
      if (newCompletedLessons.length === course.lessons.length) {
        setAllLessonsCompleted(true)
      }

      // Save progress to API
      await saveProgress(lesson.id, true, quizPassed, scorePercentage, attemptCount)
      
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
        alert("You must complete all required previous lessons before accessing this lesson.")
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
            alert("You must complete all required previous lessons before accessing this lesson.")
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
            alert("You must complete all required previous lessons before accessing this lesson.")
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
          alert("You must complete all required previous lessons before accessing this lesson.")
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
        alert("You must complete all required previous lessons before accessing this lesson.")
        return
      }
      setCurrentLessonIndex(prevIndex)
      setActiveTab("video")
      setTimeLimitExceeded(false)
    }
  }

  // Show skeleton until mounted, auth is loaded, and course data is loaded
  if (!mounted || authLoading || loading) {
    return <CourseLearningSkeleton />
  }

  if (error || !course) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || "Course not found"}</p>
          <Button onClick={() => router.push("/learner/courses")}>Back to Courses</Button>
        </div>
      </div>
    )
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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background z-50 touch-pan-y">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="max-w-[1800px] mx-auto flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex-shrink-0 h-8 sm:h-9 md:h-10">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate">Course: {course.title}</h1>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable container on mobile, fixed on desktop */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 flex flex-col min-w-0 lg:w-[70%] order-1 lg:order-none min-h-0">
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
                {((currentLesson as any).url || (currentLesson as any).vimeoVideoId) ? (
                  <div className="relative w-full overflow-hidden" style={{ paddingTop: "56.25%" }}> {/* 16:9 Aspect Ratio */}
                    <div className="absolute inset-0">
                      <VideoPlayer
                        lessonTitle={currentLesson.title}
                        onComplete={handleLessonComplete}
                        autoPlay={false}
                        isActive={true}
                        videoUrl={(currentLesson as any).url}
                        vimeoVideoId={(currentLesson as any).vimeoVideoId}
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
                            shuffleQuestions: currentLesson.quiz?.shuffleQuestions || false,
                            shuffleAnswers: false,
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={handlePreviousLesson}
                  disabled={currentLessonIndex === 0}
                  className="text-foreground bg-background hover:bg-primary/10 hover:text-primary w-full sm:w-auto min-h-[44px] sm:min-h-[40px] text-sm"
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
                  className={`text-foreground w-full sm:w-auto min-h-[44px] sm:min-h-[40px] text-sm ${
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

        {/* Sidebar - Scrollable on mobile, fixed on desktop */}
        <div className="flex-shrink-0 w-full lg:w-[30%] border-t lg:border-t-0 lg:border-l border-border bg-card order-2 lg:order-none flex flex-col min-h-0 max-h-[35vh] sm:max-h-[45vh] md:max-h-[50vh] lg:max-h-none lg:h-full">
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
                          alert("You must complete all required previous lessons before accessing this lesson.")
                          return
                        }
                        setCurrentLessonIndex(index)
                        setActiveTab("video")
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
                        ) : isCurrent ? (
                          <PlayCircle className="mr-2 sm:mr-2.5 md:mr-3 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
                        ) : (
                          <BookOpen className="mr-2 sm:mr-2.5 md:mr-3 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0 text-muted-foreground" />
                        )}
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
    </div>
  )
}
