"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { extractIdFromSlug, createCourseSlug } from "@/lib/slug"
import { useClientAuthState } from "@/utils/client-auth"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, ArrowLeft, Clock, PlayCircle, Eye, FileText, List } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import VideoPlayer from "@/app/learner/courses/[id]/learn/components/VideoPlayer"
import QuizComponent from "@/app/learner/courses/[id]/learn/components/QuizComponent"
import ResourcesPanel from "@/app/learner/courses/[id]/learn/components/ResourcesPanel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

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

export default function AdminCourseLearningPage() {
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
  const [videoProgress, setVideoProgress] = useState<{ [key: number]: number }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [timeLimitExceeded, setTimeLimitExceeded] = useState(false)
  const [completedQuizzes, setCompletedQuizzes] = useState<{ [lessonId: number]: boolean }>({})
  const [quizScores, setQuizScores] = useState<{ [lessonId: number]: number }>({})
  const [quizAnswers, setQuizAnswers] = useState<{ [lessonId: number]: number[] }>({})
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || userType !== "admin")) {
      router.push("/auth/admin/login")
    }
  }, [authLoading, user, userType, router])

  // Fetch course data (no enrollment check needed for admin)
  useEffect(() => {
    const fetchCourseData = async () => {
      // Don't fetch until auth is loaded and user is available
      if (authLoading || !user || userType !== "admin") {
        return
      }

      if (!id || !mounted) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch course data
        const courseResponse = await fetch(`/api/courses/${id}`)
        if (!courseResponse.ok) {
          if (courseResponse.status === 404) {
            router.push("/admin/courses")
            return
          }
          throw new Error("Failed to fetch course")
        }
        const courseData = await courseResponse.json()
        
        // Deduplicate lessons by ID to prevent showing duplicates
        if (courseData.course?.lessons && Array.isArray(courseData.course.lessons)) {
          const seenIds = new Set<number>()
          const uniqueLessons = courseData.course.lessons.filter((lesson: any) => {
            const lessonId = lesson.id
            if (seenIds.has(lessonId)) {
              return false
            }
            seenIds.add(lessonId)
            return true
          })
          courseData.course.lessons = uniqueLessons
        }
        
        setCourse(courseData.course)
      } catch (err: any) {
        console.error("Error fetching course:", err)
        setError(err.message || "Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [id, mounted, authLoading, user, userType, router])

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

    // NOTE: No save to API in preview mode
    
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
    }
  }

  const clearQuizData = (lessonId: number) => {
    // Clear quiz data for a specific lesson
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
    setQuizScores((prev) => {
      const updated = { ...prev }
      delete updated[lessonId]
      return updated
    })
  }

  const handleVideoProgressUpdate = async (progressPercentage: number) => {
    // Track video progress locally but don't save to API
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
      for (let i = 0; i < answers.length; i++) {
        const question = shuffledQuestions[i]
        const userAnswer = answers[i]
        const isCorrect = question && userAnswer === question.correctAnswer
        
        if (isCorrect) {
          correctCount++
        }
      }
      
      scorePercentage = (correctCount / answers.length) * 100
      const minimumScore = course?.settings?.minimumQuizScore || 50
      quizPassed = scorePercentage >= minimumScore
      
      // Set quiz score locally
      setQuizScores((prev) => ({
        ...prev,
        [lesson.id]: scorePercentage,
      }))
    }

    // Mark quiz as completed and store answers locally
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
    
    // NOTE: No save to Supabase in preview mode - all data is local only

    // Mark lesson as completed ONLY if quiz was passed (locally)
    if (quizPassed && !completedLessons.includes(currentLessonIndex)) {
      const newCompletedLessons = [...completedLessons, currentLessonIndex]
      setCompletedLessons(newCompletedLessons)
      const newProgress = (newCompletedLessons.length / course.lessons.length) * 100
      setProgress(newProgress)
      if (newCompletedLessons.length === course.lessons.length) {
        setAllLessonsCompleted(true)
      }
      
      // NOTE: No save to API in preview mode
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

  // Wait for course to load - no skeleton, just show error if needed
  if (error || (!loading && !course)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || "Course not found"}</p>
          <Button onClick={() => router.push("/admin/courses")}>Back to Courses</Button>
        </div>
      </div>
    )
  }

  // Don't render until course is loaded
  if (!course) {
    return null
  }

  const currentLesson = course.lessons[currentLessonIndex]
  if (!currentLesson) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">No lesson content available for this course</p>
          <Button onClick={() => router.push("/admin/courses")}>Back to Courses</Button>
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
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate flex-1 min-w-0">Course: {course.title}</h1>
            <Badge variant="outline" className="hidden sm:flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Preview Mode
            </Badge>
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
                          const isVideoLesson = (lesson as any).url || (lesson as any).vimeoVideoId || (lesson as any).content?.url || (lesson as any).content?.vimeoVideoId
                          const isTextLesson = (lesson as any).html || (lesson as any).text || (lesson as any).content?.html || (lesson as any).content?.text
                          const LessonIcon = isVideoLesson ? PlayCircle : isTextLesson ? FileText : PlayCircle

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
                {((currentLesson as any).url || (currentLesson as any).vimeoVideoId) ? (
                  <div className="relative w-full overflow-hidden" style={{ paddingTop: "56.25%" }}> {/* 16:9 Aspect Ratio */}
                    <div className="absolute inset-0">
                      <VideoPlayer
                        lessonTitle={currentLesson.title}
                        onComplete={handleLessonComplete}
                        autoPlay={true}
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
                          previewMode={true}
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
                  onClick={handleNextLesson}
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
                      Course Complete <CheckCircle2 className="ml-2 h-4 w-4" />
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
