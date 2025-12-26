"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
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
import { modules } from "@/data/courses"

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  
  if (diffSecs < 10) return "just now"
  if (diffSecs < 60) return `${diffSecs} seconds ago`
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
  return "recently"
}

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
        enrollmentMode: "free" | "buy" | "recurring"
        price?: number
        recurringPrice?: number
      }
      certificate: {
        certificateEnabled: boolean
        certificateTemplate: string
        certificateDescription: string
        signatureImage: string
        signatureTitle: string
        additionalText: string
        certificateType: "completion" | "participation"
      }
      currency: string
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
        recurringPrice: undefined,
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
  })

  const editCourseId = searchParams?.get("edit")
  
  // Auto-save hook with last saved tracking
  const { clearDraft, loadDraft, lastSaved } = useAutoSave({
    data: courseData,
    courseId: editCourseId || "new",
    enabled: true,
  })
  
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  
  // Update last saved time when lastSaved changes
  useEffect(() => {
    if (lastSaved) {
      setLastSavedTime(lastSaved)
    }
  }, [lastSaved])

  // Load course data on mount
  useEffect(() => {
    const loadCourseData = async () => {
      if (editCourseId) {
        // Fetch course from API when editing
        setLoading(true)
        try {
          const response = await fetch(`/api/courses/drafts?courseId=${editCourseId}`)
          if (response.ok) {
            const result = await response.json()
            if (result.course) {
              // Transform database format to course builder format
              const course = result.course
              setCourseData({
                basicInfo: {
                  title: course.title || "",
                  requirements: course.requirements || "",
                  description: course.description || "",
                  whoIsThisFor: course.who_is_this_for || "",
                  thumbnail: course.thumbnail || "",
                  previewVideo: course.preview_video || "",
                  price: course.price?.toString() || "",
                },
                lessons: (course.lessons || []).map((lesson: any) => ({
                  id: lesson.id?.toString() || `lesson-${Date.now()}`,
                  title: lesson.title || "",
                  type: lesson.type || "text",
                  content: lesson.content || {},
                  resources: lesson.resources || [],
                  settings: lesson.settings || {},
                  quiz: lesson.quiz || null,
                  estimatedDuration: lesson.estimated_duration || 0,
                })),
                settings: course.settings || {
                  isPublished: course.is_published || false,
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
              })
            }
          }
        } catch (error) {
          console.error("Error loading course:", error)
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
        return {
          ...prev,
          [section]: updatedSection,
        }
      }
      return prev
    })
  }, [])

  const handleSaveDraft = async () => {
    console.log("Save to Draft clicked", { title: courseData.basicInfo.title })
    
    // Validate course title is required
    if (!courseData.basicInfo.title || courseData.basicInfo.title.trim() === "") {
      console.log("Validation failed: Course title is required")
      toast.error("Course title is required. Please enter a course title before saving.")
      return
    }

    console.log("Starting save draft...")
    setIsSavingDraft(true)
    try {
      const response = await fetch("/api/courses/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: editCourseId || "new",
          courseData: courseData,
          isPublished: false, // Save as draft
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save draft")
      }

      const result = await response.json()
      
      // If we got a courseId back and we were creating a new course, update the URL
      if (result.courseId && !editCourseId) {
        router.replace(`/admin/courses/new?edit=${result.courseId}`)
      }
      
      // Clear localStorage draft
      clearDraft()
      
      toast.success("Draft saved successfully")
      
      // Navigate to courses page
      router.push("/admin/courses")
    } catch (error: any) {
      console.error("Error saving draft:", error)
      toast.error(error.message || "Failed to save draft")
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handlePublishCourse = async () => {
    console.log("Publish clicked", { 
      title: courseData.basicInfo.title, 
      description: courseData.basicInfo.description 
    })
    
    // Validate required fields
    if (!courseData.basicInfo.title || !courseData.basicInfo.description) {
      console.log("Validation failed: Required fields missing")
      toast.error("Please fill in all required fields")
      return
    }

    console.log("Starting publish...")
    setIsPublishing(true)
    try {
      const response = await fetch("/api/courses/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: editCourseId || "new",
          courseData: courseData,
          isPublished: true, // Publish the course
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to publish course")
      }

      const result = await response.json()
      
      // If we got a courseId back and we were creating a new course, update the URL
      if (result.courseId && !editCourseId) {
        router.replace(`/admin/courses/new?edit=${result.courseId}`)
      }
      
      // Clear draft on successful publish
      clearDraft()
      
      toast.success("Course published successfully")
      
      // Navigate to courses page
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
      <div className="pt-4 md:pt-8 pb-8">
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
    <div className="pt-4 md:pt-8 pb-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
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
          {lastSavedTime && (
            <span className="text-xs text-muted-foreground">
              Draft auto-saved {formatTimeAgo(lastSavedTime)}
            </span>
          )}
          <Button 
            type="button"
            variant="outline" 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleSaveDraft()
            }}
            disabled={isSavingDraft || isPublishing}
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
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handlePublishCourse()
            }}
            disabled={isSavingDraft || isPublishing}
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
                availableCourses={modules.map((m) => ({ id: m.id, title: m.title }))}
              />
            </TabsContent>

            <TabsContent value="lessons" className="mt-0 space-y-4">
              <LessonBuilder 
                lessons={courseData.lessons} 
                onUpdate={(lessons) => updateCourseData("lessons", lessons)}
                minimumQuizScore={courseData.settings.minimumQuizScore}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-4">
              <CourseSettings
                settings={courseData.settings}
                onUpdate={(settings) => updateCourseData("settings", settings)}
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
    <div className="pt-4 md:pt-8 pb-8">
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
