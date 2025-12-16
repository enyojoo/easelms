"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { getClientAuthState } from "@/utils/client-auth" // Correct import
import { modules } from "@/data/courses"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, ArrowLeft, Clock, PlayCircle } from "lucide-react"
import VideoPlayer from "./components/VideoPlayer"
import QuizComponent from "./components/QuizComponent"
import ResourcesPanel from "./components/ResourcesPanel"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function CourseLearningPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [course, setCourse] = useState<any>(null)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("video")
  const [completedLessons, setCompletedLessons] = useState<number[]>([])
  const [allLessonsCompleted, setAllLessonsCompleted] = useState(false)
  const [lessonStartTime, setLessonStartTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [timeLimitExceeded, setTimeLimitExceeded] = useState(false)
  const [videoProgress, setVideoProgress] = useState<{ [key: number]: number }>({})

  useEffect(() => {
    const { isLoggedIn, userType } = getClientAuthState()
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/learner/login")
    } else {
      const courseData = modules.find((m) => m.id === Number.parseInt(id))
      if (courseData) {
        setCourse(courseData)
        // Load saved progress from localStorage
        try {
          const savedProgress = localStorage.getItem(`course-${id}-progress`)
          if (savedProgress) {
            const { completedLessons: saved, videoProgress: savedVideo } = JSON.parse(savedProgress)
            if (saved && Array.isArray(saved)) {
              setCompletedLessons(saved)
              setProgress((saved.length / courseData.lessons.length) * 100)
            }
            if (savedVideo) {
              setVideoProgress(savedVideo)
            }
          }
        } catch (error) {
          console.error("Error loading saved progress:", error)
        }
      } else {
        router.push("/learner/courses")
      }
    }
  }, [router, id])

  // Save progress to localStorage
  useEffect(() => {
    if (course && id) {
      try {
        localStorage.setItem(
          `course-${id}-progress`,
          JSON.stringify({
            completedLessons,
            videoProgress,
            lastUpdated: new Date().toISOString(),
          })
        )
      } catch (error) {
        console.error("Error saving progress:", error)
      }
    }
  }, [completedLessons, videoProgress, course, id])

  // Time limit enforcement
  useEffect(() => {
    if (!course) return
    const currentLesson = course.lessons[currentLessonIndex]
    if (!currentLesson?.settings?.timeLimit || currentLesson.settings.timeLimit === 0) {
      setTimeRemaining(null)
      setTimeLimitExceeded(false)
      setLessonStartTime(null)
      return
    }

    // Set start time when lesson is accessed
    const startTime = Date.now()
    setLessonStartTime(startTime)
    const limitInMs = currentLesson.settings.timeLimit * 60 * 1000 // Convert minutes to milliseconds

    // Check time limit every second
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, limitInMs - elapsed)
      setTimeRemaining(Math.ceil(remaining / 1000)) // Convert to seconds

      if (remaining === 0 && !timeLimitExceeded) {
        setTimeLimitExceeded(true)
        // Prevent further interaction when time limit is exceeded
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [currentLessonIndex, course, timeLimitExceeded])

  // Check if required lessons are completed before allowing access
  const canAccessLesson = (lessonIndex: number): boolean => {
    if (!course) return false
    const lesson = course.lessons[lessonIndex]
    
    // If lesson is not required, always allow access
    if (!lesson?.settings?.isRequired) return true

    // Check if all previous required lessons are completed
    for (let i = 0; i < lessonIndex; i++) {
      const prevLesson = course.lessons[i]
      if (prevLesson?.settings?.isRequired && !completedLessons.includes(i)) {
        return false
      }
    }

    return true
  }

  // Check if can skip current lesson
  const canSkipLesson = (): boolean => {
    if (!course) return false
    const currentLesson = course.lessons[currentLessonIndex]
    return currentLesson?.settings?.allowSkip ?? true
  }

  const handleLessonComplete = () => {
    if (!completedLessons.includes(currentLessonIndex)) {
      const newCompletedLessons = [...completedLessons, currentLessonIndex]
      setCompletedLessons(newCompletedLessons)
      const newProgress = (newCompletedLessons.length / course.lessons.length) * 100
      setProgress(newProgress)
      if (newCompletedLessons.length === course.lessons.length) {
        setAllLessonsCompleted(true)
      }
    }
    setActiveTab("quiz")
  }

  const handleVideoProgressUpdate = (progressPercentage: number) => {
    setVideoProgress((prev) => ({
      ...prev,
      [currentLessonIndex]: progressPercentage,
    }))
  }

  const handleQuizComplete = () => {
    setActiveTab("resources")
  }

  const handleNextLesson = () => {
    if (activeTab === "video") {
      // Check if can skip lesson
      if (!canSkipLesson() && !completedLessons.includes(currentLessonIndex)) {
        alert("This lesson cannot be skipped. Please complete it before proceeding.")
        return
      }
      // If quiz is enabled, go to quiz, otherwise go to resources
      if (currentLesson.quiz?.enabled && currentLesson.quiz?.questions && currentLesson.quiz.questions.length > 0) {
        setActiveTab("quiz")
      } else {
        setActiveTab("resources")
      }
    } else if (activeTab === "quiz") {
      setActiveTab("resources")
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
        router.push(`/learner/courses/${id}/learn/summary`)
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

  if (!course) return null

  const currentLesson = course.lessons[currentLessonIndex]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-3 sm:px-4 md:px-6 py-3 md:py-4">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Course: {course.title}</h1>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable container on mobile, fixed on desktop */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 flex flex-col min-w-0 lg:w-[70%] order-1 lg:order-none">
          <div className="flex-1 flex flex-col min-h-0 bg-card border-r border-border">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="flex-shrink-0 w-full justify-start bg-muted p-0 h-12 border-b border-border overflow-x-auto">
                <TabsTrigger
                  value="video"
                  className="rounded-none h-12 px-4 sm:px-6 md:px-8 flex-shrink-0"
                >
                  {currentLesson.type === "text" ? "Content" : "Video"}
                </TabsTrigger>
                {currentLesson.quiz?.enabled && currentLesson.quiz?.questions && currentLesson.quiz.questions.length > 0 && (
                  <TabsTrigger
                    value="quiz"
                    className="rounded-none h-12 px-4 sm:px-6 md:px-8 flex-shrink-0"
                  >
                    Quiz
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="resources"
                  className="rounded-none h-12 px-4 sm:px-6 md:px-8 flex-shrink-0"
                >
                  Resources
                </TabsTrigger>
              </TabsList>

              <TabsContent value="video" className="flex-1 m-0 p-0 flex overflow-hidden min-h-0">
                {timeLimitExceeded ? (
                  <div className="w-full h-full flex items-center justify-center bg-black text-white p-4">
                    <div className="text-center max-w-md">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-red-500" />
                      <h3 className="text-lg sm:text-xl font-semibold mb-2">Time Limit Exceeded</h3>
                      <p className="text-sm text-muted-foreground">
                        You have exceeded the time limit for this lesson. Please contact your instructor.
                      </p>
                    </div>
                  </div>
                ) : currentLesson.type === "text" ? (
                  <ScrollArea className="w-full h-full">
                    <div className="p-4 sm:p-6">
                      <div 
                        className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: currentLesson.content?.html || currentLesson.content?.text || "<p>No content available for this lesson.</p>"
                        }}
                      />
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="w-full h-full relative bg-black">
                    <VideoPlayer
                      lessonTitle={currentLesson.title}
                      onComplete={handleLessonComplete}
                      autoPlay={false}
                      isActive={true}
                      videoUrl={currentLesson.content?.url}
                      vimeoVideoId={currentLesson.content?.vimeoVideoId}
                      courseId={id}
                      lessonId={currentLesson.id?.toString() || "lesson-" + String(currentLessonIndex)}
                      videoProgression={currentLesson.settings?.videoProgression ?? false}
                      onProgressUpdate={handleVideoProgressUpdate}
                    />
                  </div>
                )}
              </TabsContent>

              {currentLesson.quiz?.enabled && currentLesson.quiz?.questions && currentLesson.quiz.questions.length > 0 && (
                <TabsContent value="quiz" className="flex-1 m-0 p-0 min-h-0">
                  <ScrollArea className="w-full h-full">
                    <div className="p-4 sm:p-6">
                      <QuizComponent
                      quiz={{
                        questions: currentLesson.quiz.questions.map((q: any) => {
                          // Convert admin quiz format to learner format
                          if (q.type === "multiple-choice") {
                            return {
                              question: q.text || "",
                              options: q.options || [],
                              correctAnswer: q.correctOption || 0,
                              id: q.id,
                            }
                          }
                          // For fill-in-blank, convert to multiple choice format for now
                          if (q.type === "fill-blank") {
                            return {
                              question: q.text || "",
                              options: q.correctAnswers || [],
                              correctAnswer: 0, // First option is correct for fill-blank
                              id: q.id,
                            }
                          }
                          // For short-answer, show as text input (simplified for now)
                          if (q.type === "short-answer") {
                            return {
                              question: q.text || "",
                              options: q.correctKeywords || [],
                              correctAnswer: 0,
                              id: q.id,
                            }
                          }
                          // For essay/longer answer, show as text area (simplified for now)
                          if (q.type === "essay") {
                            return {
                              question: q.text || "",
                              options: [],
                              correctAnswer: -1, // No correct answer for essay
                              id: q.id,
                            }
                          }
                          // Default fallback
                          return {
                            question: q.text || q.question || "",
                            options: q.options || [],
                            correctAnswer: q.correctOption || q.correctAnswer || 0,
                            id: q.id,
                          }
                        }),
                        shuffleQuestions: (currentLesson.quiz as any).shuffleQuestions,
                        shuffleAnswers: (currentLesson.quiz as any).shuffleAnswers,
                        showResultsImmediately: (currentLesson.quiz as any).showResultsImmediately,
                        allowMultipleAttempts: (currentLesson.quiz as any).allowMultipleAttempts,
                        showCorrectAnswers: (currentLesson.quiz as any).showCorrectAnswers,
                      }}
                        onComplete={handleQuizComplete}
                        minimumQuizScore={course?.settings?.minimumQuizScore || 50}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              <TabsContent value="resources" className="flex-1 m-0 p-0 min-h-0">
                <ScrollArea className="w-full h-full">
                  <div className="p-4 sm:p-6">
                    <ResourcesPanel 
                      resources={currentLesson.resources || []} 
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 p-3 sm:p-4 border-t border-border bg-background">
              {/* Time Limit Display */}
              {timeRemaining !== null && timeRemaining > 0 && (() => {
                const mins = Math.floor(timeRemaining / 60)
                const secs = Math.floor(timeRemaining % 60)
                const secsStr = secs < 10 ? "0" + secs.toString() : secs.toString()
                return (
                  <div className="mb-3 flex items-center justify-center gap-2 text-xs sm:text-sm">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="font-medium">
                      Time Remaining: {mins.toString()}:{secsStr}
                    </span>
                  </div>
                )
              })()}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={handlePreviousLesson}
                  disabled={currentLessonIndex === 0 || timeLimitExceeded}
                  className="text-foreground bg-background hover:bg-primary/10 hover:text-primary w-full sm:w-auto order-2 sm:order-1"
                  size="sm"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>

                <div className="text-center w-full sm:w-auto order-1 sm:order-2">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                    Lesson {currentLessonIndex + 1} of {course.lessons.length}
                  </p>
                  <Progress value={progress} className="w-full sm:w-[200px] bg-secondary h-1.5 sm:h-2" />
                </div>

                <Button
                  variant={allLessonsCompleted ? "default" : "outline"}
                  onClick={
                    allLessonsCompleted ? () => router.push("/learner/courses/" + id + "/learn/summary") : handleNextLesson
                  }
                  disabled={
                    timeLimitExceeded ||
                    (!allLessonsCompleted &&
                      activeTab === "resources" &&
                      currentLessonIndex === course.lessons.length - 1)
                  }
                  className={`text-foreground w-full sm:w-auto order-3 ${
                    allLessonsCompleted
                      ? "bg-primary hover:bg-primary-dark text-primary-foreground"
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
        <div className="flex-shrink-0 w-full lg:w-[30%] border-t lg:border-t-0 lg:border-l border-border bg-card order-2 lg:order-none flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4">
            <div className="mb-4 flex-shrink-0">
              <h3 className="text-sm sm:text-base font-semibold mb-2">Course Progress</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-1.5 sm:h-2" />
                <p className="text-xs text-muted-foreground">
                  {completedLessons.length} of {course.lessons.length} lessons completed
                </p>
              </div>
            </div>
            <div className="border-t pt-3 sm:pt-4 flex-1 flex flex-col min-h-0">
              <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 flex-shrink-0">Course Content</h3>
              <ScrollArea className="flex-1">
                <div className="space-y-1.5 sm:space-y-2 pr-2">
                {course.lessons.map((lesson: any, index: number) => {
                  const isCompleted = completedLessons.includes(index)
                  const isCurrent = index === currentLessonIndex
                  const videoProgressPercent = videoProgress[index] || 0
                  const lessonProgress = isCompleted ? 100 : isCurrent ? Math.max(50, videoProgressPercent) : videoProgressPercent
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
                      className={`w-full text-left p-2 sm:p-3 rounded-md sm:rounded-lg flex items-center justify-between transition-colors text-xs sm:text-sm border ${
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
                          <CheckCircle2 className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-green-500" />
                        ) : isCurrent ? (
                          <PlayCircle className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        ) : (
                          <BookOpen className="mr-2 sm:mr-3 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className={`truncate block ${isCurrent ? "font-semibold" : ""}`}>
                              {index + 1}. {lesson.title}
                            </span>
                            {isRequired && (
                              <span className="text-[10px] sm:text-xs bg-yellow-500 text-yellow-900 dark:text-yellow-100 px-1 sm:px-1.5 py-0.5 rounded flex-shrink-0">
                                Required
                              </span>
                            )}
                          </div>
                          {(isCurrent || videoProgressPercent > 0) && (
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                              <Progress value={lessonProgress} className="h-1 w-16 sm:w-20" />
                              <span className="text-[10px] sm:text-xs opacity-75">{Math.round(lessonProgress)}%</span>
                            </div>
                          )}
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
