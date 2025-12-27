"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, ArrowLeft, Clock, PlayCircle } from "lucide-react"
import CourseLearningSkeleton from "@/components/CourseLearningSkeleton"
import VideoPlayer from "@/app/learner/courses/[id]/learn/components/VideoPlayer"
import QuizComponent from "@/app/learner/courses/[id]/learn/components/QuizComponent"
import ResourcesPanel from "@/app/learner/courses/[id]/learn/components/ResourcesPanel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useClientAuthState } from "@/utils/client-auth"

interface Course {
  id: number
  title: string
  lessons: Array<{
    id: number
    title: string
    type?: string
    settings?: any
    content?: any
    resources?: Array<any>
    quiz?: any
    estimated_duration?: number
  }>
}

export default function AdminCoursePreviewLearningPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const { user, loading: authLoading, userType } = useClientAuthState()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [activeTab, setActiveTab] = useState("video")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check admin access and fetch course data
  useEffect(() => {
    if (!authLoading && (!user || (userType !== "admin" && userType !== "instructor"))) {
      router.push("/auth/admin/login")
      return
    }

    const fetchCourseData = async () => {
      if (!mounted || !user || (userType !== "admin" && userType !== "instructor") || !courseId) return

      try {
        setLoading(true)
        setError(null)

        // Fetch course data
        const courseResponse = await fetch(`/api/courses/${courseId}`)
        if (!courseResponse.ok) {
          if (courseResponse.status === 404) {
            router.push("/admin/courses")
            return
          }
          throw new Error("Failed to fetch course")
        }
        const courseData = await courseResponse.json()
        setCourse(courseData.course)
      } catch (err: any) {
        console.error("Error fetching course:", err)
        setError(err.message || "Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [courseId, user, userType, authLoading, mounted, router])

  const isLoading = !mounted || authLoading || !user || (userType !== "admin" && userType !== "instructor") || loading

  if (isLoading) {
    return <CourseLearningSkeleton />
  }

  if (error || !course) {
    return (
      <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <p className="text-destructive">{error || "Course not found"}</p>
          <Button onClick={() => router.push("/admin/courses")}>Back to Courses</Button>
        </div>
      </div>
    )
  }

  const currentLesson = course.lessons?.[currentLessonIndex]
  const totalLessons = course.lessons?.length || 0
  const progress = ((currentLessonIndex + 1) / totalLessons) * 100

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1)
      setActiveTab("video")
    }
  }

  const handleNextLesson = () => {
    if (currentLessonIndex < totalLessons - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1)
      setActiveTab("video")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 md:py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="flex-shrink-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary break-words">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Lesson {currentLessonIndex + 1} of {totalLessons} • Admin Preview
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentLesson && (
              <div className="space-y-4 md:space-y-6">
                {/* Video/Content Player */}
                <div className="bg-black rounded-lg overflow-hidden">
                  <VideoPlayer lesson={currentLesson} courseId={course.id} />
                </div>

                {/* Lesson Title and Navigation */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-primary mb-2">
                      {currentLesson.title}
                    </h2>
                    {currentLesson.estimated_duration && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{Math.round(currentLesson.estimated_duration / 60)} minutes</span>
                      </div>
                    )}
                  </div>

                  {/* Tabs for Content */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="video">Overview</TabsTrigger>
                      {currentLesson.resources && currentLesson.resources.length > 0 && (
                        <TabsTrigger value="resources">Resources</TabsTrigger>
                      )}
                      {currentLesson.quiz && (
                        <TabsTrigger value="quiz">Quiz</TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="video" className="mt-6">
                      <div className="prose prose-invert max-w-none">
                        {currentLesson.content?.description && (
                          <div className="text-muted-foreground leading-relaxed">
                            {typeof currentLesson.content.description === "string" ? (
                              <p>{currentLesson.content.description}</p>
                            ) : (
                              <div dangerouslySetInnerHTML={{ __html: currentLesson.content.description }} />
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {currentLesson.resources && currentLesson.resources.length > 0 && (
                      <TabsContent value="resources" className="mt-6">
                        <ResourcesPanel resources={currentLesson.resources} />
                      </TabsContent>
                    )}

                    {currentLesson.quiz && (
                      <TabsContent value="quiz" className="mt-6">
                        <QuizComponent lesson={currentLesson} courseId={course.id} />
                      </TabsContent>
                    )}
                  </Tabs>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousLesson}
                    disabled={currentLessonIndex === 0}
                    className="flex items-center"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextLesson}
                    disabled={currentLessonIndex === totalLessons - 1}
                    className="flex items-center"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Course Outline */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border p-4 sticky top-24 max-h-[calc(100vh-120px)] overflow-auto">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Course Lessons
              </h3>
              <ScrollArea className="h-auto">
                <div className="space-y-2">
                  {course.lessons?.map((lesson, index) => (
                    <button
                      key={lesson.id || index}
                      onClick={() => {
                        setCurrentLessonIndex(index)
                        setActiveTab("video")
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                        currentLessonIndex === index
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <PlayCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="font-medium truncate break-words">{lesson.title}</p>
                          {lesson.estimated_duration && (
                            <p className="text-xs mt-1 opacity-80">
                              {Math.round(lesson.estimated_duration / 60)}m
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

