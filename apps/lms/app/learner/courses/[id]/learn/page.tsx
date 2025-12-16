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

// Updated quiz data for each lesson
const lessonQuizzes = {
  "Intro to Communication": {
    questions: [
      {
        question: "What is the primary purpose of communication?",
        options: [
          "To express emotions only",
          "To exchange information and create understanding",
          "To speak in public",
          "To write emails",
        ],
        correctAnswer: 1,
      },
      {
        question: "Which of the following is a key element of effective communication?",
        options: ["Speaking quickly", "Using complex vocabulary", "Active listening", "Avoiding eye contact"],
        correctAnswer: 2,
      },
    ],
  },
  "Public Speaking Essentials": {
    questions: [
      {
        question: "What is the most important aspect of public speaking?",
        options: ["Wearing formal attire", "Speaking loudly", "Audience engagement", "Memorizing the script"],
        correctAnswer: 2,
      },
      {
        question: "How can you overcome public speaking anxiety?",
        options: ["Avoid preparation", "Practice and preparation", "Speak quickly", "Read directly from notes"],
        correctAnswer: 1,
      },
    ],
  },
  "Non-Verbal Communication": {
    questions: [
      {
        question: "Which of these is an example of non-verbal communication?",
        options: ["Speaking", "Writing", "Body language", "Singing"],
        correctAnswer: 2,
      },
      {
        question: "What percentage of communication is non-verbal?",
        options: ["20%", "40%", "60%", "93%"],
        correctAnswer: 3,
      },
    ],
  },
  "Active Listening Skills": {
    questions: [
      {
        question: "What is the main goal of active listening?",
        options: [
          "To interrupt the speaker",
          "To formulate your response while the other person is talking",
          "To understand and retain the information being communicated",
          "To finish the conversation quickly",
        ],
        correctAnswer: 2,
      },
      {
        question: "Which of the following is NOT a characteristic of active listening?",
        options: [
          "Maintaining eye contact",
          "Providing verbal and non-verbal feedback",
          "Interrupting to share your own experiences",
          "Asking clarifying questions",
        ],
        correctAnswer: 2,
      },
    ],
  },
  "Persuasive Communication": {
    questions: [
      {
        question: "What is the primary goal of persuasive communication?",
        options: [
          "To entertain the audience",
          "To inform the audience",
          "To influence the audience's beliefs or actions",
          "To confuse the audience",
        ],
        correctAnswer: 2,
      },
      {
        question: "Which of these is NOT one of Aristotle's three modes of persuasion?",
        options: ["Ethos (Credibility)", "Pathos (Emotional Appeal)", "Logos (Logical Appeal)", "Kairos (Timing)"],
        correctAnswer: 3,
      },
    ],
  },
  "Effective Storytelling": {
    questions: [
      {
        question: "Why is storytelling an effective communication tool?",
        options: [
          "It helps people remember information better",
          "It creates emotional connections",
          "It makes complex ideas more accessible",
          "All of the above",
        ],
        correctAnswer: 3,
      },
      {
        question: "What is the typical structure of a story?",
        options: [
          "Beginning, Climax, Ending",
          "Introduction, Body, Conclusion",
          "Setup, Confrontation, Resolution",
          "Opening, Middle, Finale",
        ],
        correctAnswer: 2,
      },
    ],
  },
  "Presentation Skills with Tech": {
    questions: [
      {
        question: "What is the '10-20-30 Rule' in presentations?",
        options: [
          "10 slides, 20 minutes, 30-point font",
          "10 minutes, 20 slides, 30 seconds per slide",
          "10 sections, 20 slides, 30 minutes",
          "10 points, 20 examples, 30 minutes",
        ],
        correctAnswer: 0,
      },
      {
        question: "Which of these is NOT a recommended practice for using technology in presentations?",
        options: [
          "Using high-quality images",
          "Including minimal text on slides",
          "Adding complex animations to every slide",
          "Practicing with the technology beforehand",
        ],
        correctAnswer: 2,
      },
    ],
  },
  "Handling Q&A and Feedback": {
    questions: [
      {
        question: "What should you do if you don't know the answer to a question during Q&A?",
        options: [
          "Make up an answer",
          "Ignore the question",
          "Admit you don't know and offer to find out",
          "Change the subject",
        ],
        correctAnswer: 2,
      },
      {
        question: "Which of these is a good practice for handling negative feedback?",
        options: [
          "Argue with the person giving feedback",
          "Ignore the feedback completely",
          "Listen actively and ask for specific examples",
          "Take it personally and get defensive",
        ],
        correctAnswer: 2,
      },
    ],
  },
}

// Updated resources data for each lesson
const lessonResources = {
  "Intro to Communication": [
    { type: "document", title: "Communication Basics PDF", url: "/dummy-files/communication-basics.pdf" },
    { type: "link", title: "Effective Communication Techniques", url: "https://example.com/effective-communication" },
  ],
  "Public Speaking Essentials": [
    { type: "document", title: "Public Speaking Cheat Sheet", url: "/dummy-files/public-speaking-cheatsheet.pdf" },
    { type: "link", title: "TED Talks on Public Speaking", url: "https://example.com/ted-talks-public-speaking" },
  ],
  "Non-Verbal Communication": [
    { type: "document", title: "Body Language Guide", url: "/dummy-files/body-language-guide.pdf" },
    {
      type: "link",
      title: "Non-Verbal Cues in Different Cultures",
      url: "https://example.com/non-verbal-cues-cultures",
    },
  ],
  "Active Listening Skills": [
    { type: "document", title: "Active Listening Techniques", url: "/dummy-files/active-listening-techniques.pdf" },
    {
      type: "link",
      title: "The Importance of Active Listening",
      url: "https://example.com/importance-of-active-listening",
    },
  ],
  "Persuasive Communication": [
    { type: "document", title: "Persuasion Techniques Guide", url: "/dummy-files/persuasion-techniques.pdf" },
    { type: "link", title: "The Art of Persuasion in Business", url: "https://example.com/persuasion-in-business" },
  ],
  "Effective Storytelling": [
    { type: "document", title: "Storytelling in Business PDF", url: "/dummy-files/storytelling-in-business.pdf" },
    { type: "link", title: "The Science of Storytelling", url: "https://example.com/science-of-storytelling" },
  ],
  "Presentation Skills with Tech": [
    { type: "document", title: "Tech Presentation Tips", url: "/dummy-files/tech-presentation-tips.pdf" },
    { type: "link", title: "Best Presentation Software 2023", url: "https://example.com/best-presentation-software" },
  ],
  "Handling Q&A and Feedback": [
    { type: "document", title: "Q&A Session Best Practices", url: "/dummy-files/qa-best-practices.pdf" },
    {
      type: "link",
      title: "Dealing with Difficult Questions",
      url: "https://example.com/handling-difficult-questions",
    },
  ],
}

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
      setActiveTab("quiz")
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
    <div className="pt-2 pb-2 md:pt-5 md:pb-5 px-1 sm:px-2 md:px-3 lg:px-6">
      <div className="max-w-full lg:max-w-[1800px] mx-auto py-2 flex-grow">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Course: {course.title}</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-grow flex flex-col order-1 lg:order-none w-full lg:w-[70%]">
            <div className="rounded-lg overflow-hidden bg-card border border-border flex-grow flex flex-col shadow-lg">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-grow flex flex-col">
                <TabsList className="w-full justify-start bg-muted p-0 h-12 border-b border-border">
                  <TabsTrigger
                    value="video"
                    className="rounded-none h-12 px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Video
                  </TabsTrigger>
                  <TabsTrigger
                    value="quiz"
                    className="rounded-none h-12 px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Quiz
                  </TabsTrigger>
                  <TabsTrigger
                    value="resources"
                    className="rounded-none h-12 px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Resources
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="video" className="flex-grow m-0 p-0 flex overflow-hidden">
                  <div className="w-full h-full lg:h-[370px] aspect-video relative">
                    {timeLimitExceeded ? (
                      <div className="w-full h-full flex items-center justify-center bg-black text-white">
                        <div className="text-center">
                          <Clock className="h-12 w-12 mx-auto mb-4 text-red-500" />
                          <h3 className="text-xl font-semibold mb-2">Time Limit Exceeded</h3>
                          <p className="text-muted-foreground">
                            You have exceeded the time limit for this lesson. Please contact your instructor.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <VideoPlayer
                        lessonTitle={currentLesson.title}
                        onComplete={handleLessonComplete}
                        autoPlay={false}
                        isActive={true}
                        videoUrl={currentLesson.content?.url}
                        vimeoVideoId={currentLesson.content?.vimeoVideoId}
                        courseId={id}
                        lessonId={currentLesson.id?.toString() || `lesson-${currentLessonIndex}`}
                        videoProgression={currentLesson.settings?.videoProgression ?? false}
                        onProgressUpdate={handleVideoProgressUpdate}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="quiz" className="flex-grow m-0 p-4 md:p-6 lg:h-[370px] overflow-y-auto">
                  {currentLesson.quiz?.enabled && currentLesson.quiz?.questions && currentLesson.quiz.questions.length > 0 ? (
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
                          // For other question types, return a simple format
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
                  ) : currentLesson.title && lessonQuizzes[currentLesson.title as keyof typeof lessonQuizzes] ? (
                    // Fallback to hardcoded quizzes for backward compatibility
                    <QuizComponent
                      quiz={lessonQuizzes[currentLesson.title as keyof typeof lessonQuizzes]}
                      onComplete={handleQuizComplete}
                      minimumQuizScore={course?.settings?.minimumQuizScore || 50}
                    />
                  ) : (
                    <div className="text-center p-8">
                      <p className="text-muted-foreground">No quiz available for this lesson.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="resources" className="flex-grow m-0 p-4 md:p-6 lg:h-[370px] overflow-y-auto">
                  <ResourcesPanel resources={currentLesson.title ? ((lessonResources[currentLesson.title as keyof typeof lessonResources] || []) as { type: "document" | "link"; title: string; url: string }[]) : []} />
                </TabsContent>
              </Tabs>

              <div className="p-3 md:p-4 border-t border-border bg-background">
                {/* Time Limit Display */}
                {timeRemaining !== null && timeRemaining > 0 && (
                  <div className="mb-3 flex items-center justify-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      Time Remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    onClick={handlePreviousLesson}
                    disabled={currentLessonIndex === 0 || timeLimitExceeded}
                    className="text-foreground bg-background hover:bg-primary/10 hover:text-primary w-full sm:w-auto"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>

                  <div className="text-center w-full sm:w-auto">
                    <p className="text-sm text-muted-foreground mb-1">
                      Lesson {currentLessonIndex + 1} of {course.lessons.length}
                    </p>
                    <Progress value={progress} className="w-full sm:w-[200px] bg-secondary" />
                  </div>

                  <Button
                    variant={allLessonsCompleted ? "default" : "outline"}
                    onClick={
                      allLessonsCompleted ? () => router.push(`/learner/courses/${id}/learn/summary`) : handleNextLesson
                    }
                    disabled={
                      timeLimitExceeded ||
                      (!allLessonsCompleted &&
                        activeTab === "resources" &&
                        currentLessonIndex === course.lessons.length - 1)
                    }
                    className={`text-foreground w-full sm:w-auto ${
                      allLessonsCompleted
                        ? "bg-primary hover:bg-primary-dark text-primary-foreground"
                        : "bg-background hover:bg-primary/10 hover:text-primary"
                    }`}
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

          <div className="w-full lg:w-[30%] mb-6 lg:mb-0 order-2 lg:order-none lg:pl-6">
            <div className="rounded-lg bg-card border border-border p-4 h-full overflow-auto shadow-lg">
              <div className="mb-4">
                <h3 className="text-base font-semibold mb-2">Course Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {completedLessons.length} of {course.lessons.length} lessons completed
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-base font-semibold mb-4">Course Content</h3>
                <div className="space-y-2">
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
                        className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors text-sm border ${
                          !canAccess
                            ? "opacity-50 cursor-not-allowed bg-muted border-border"
                            : isCurrent
                              ? "bg-primary text-primary-foreground border-primary"
                              : isCompleted
                                ? "bg-muted/50 border-green-200 dark:border-green-800"
                                : "hover:bg-accent hover:text-accent-foreground border-border"
                        }`}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          {isCompleted ? (
                            <CheckCircle2 className="mr-3 h-4 w-4 flex-shrink-0 text-green-500" />
                          ) : isCurrent ? (
                            <PlayCircle className="mr-3 h-4 w-4 flex-shrink-0" />
                          ) : (
                            <BookOpen className="mr-3 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`truncate block ${isCurrent ? "font-semibold" : ""}`}>
                                {index + 1}. {lesson.title}
                              </span>
                              {isRequired && (
                                <span className="text-xs bg-yellow-500 text-yellow-900 dark:text-yellow-100 px-1.5 py-0.5 rounded">
                                  Required
                                </span>
                              )}
                            </div>
                            {(isCurrent || videoProgressPercent > 0) && (
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={lessonProgress} className="h-1 w-20" />
                                <span className="text-xs opacity-75">{Math.round(lessonProgress)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
