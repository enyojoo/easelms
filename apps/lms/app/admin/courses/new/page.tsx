"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
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
  
  // Update last saved time when lastSaved changes
  useEffect(() => {
    if (lastSaved) {
      setLastSavedTime(lastSaved)
    }
  }, [lastSaved])

  // Load draft on mount (only if not editing)
  useEffect(() => {
    const loadDraftData = async () => {
      if (!editCourseId) {
        const draft = await loadDraft()
        if (draft) {
          setCourseData(draft)
        }
      }
    }
    loadDraftData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  useEffect(() => {
    if (editCourseId) {
      const courseToEdit = modules.find((m) => m.id === Number.parseInt(editCourseId))
      if (courseToEdit) {
        setCourseData({
          basicInfo: {
            title: courseToEdit.title ?? "",
            requirements: courseToEdit.requirements ?? "",
            description: courseToEdit.description ?? "",
            whoIsThisFor: courseToEdit.whoIsThisFor ?? "",
            thumbnail: courseToEdit.image ?? "",
            previewVideo: courseToEdit.previewVideo ?? "",
            price: courseToEdit.price?.toString() ?? "",
          },
          lessons: courseToEdit.lessons.map((lesson) => ({
            id: lesson.id ?? `lesson-${Date.now()}-${Math.random()}`,
            title: lesson.title ?? "",
            type: lesson.type ?? "video",
            content: lesson.content ?? {},
            resources: lesson.resources ?? [],
            settings: {
              isRequired: lesson.settings?.isRequired ?? true,
              videoProgression: lesson.settings?.videoProgression ?? true,
              allowSkip: lesson.settings?.allowSkip ?? false,
              timeLimit: lesson.settings?.timeLimit ?? 0,
            },
            quiz: lesson.quiz ?? {
              enabled: false,
              questions: [],
            },
          })),
          settings: {
            ...courseData.settings,
            ...(courseToEdit.settings && {
              isPublished: courseToEdit.settings.isPublished ?? courseData.settings.isPublished,
              requiresSequentialProgress: courseToEdit.settings.requiresSequentialProgress ?? courseData.settings.requiresSequentialProgress,
              minimumQuizScore: courseToEdit.settings.minimumQuizScore ?? courseData.settings.minimumQuizScore,
              enrollment: courseToEdit.settings.enrollment
                ? {
                    ...courseToEdit.settings.enrollment,
                    enrollmentMode: (["free", "buy", "recurring"].includes(courseToEdit.settings.enrollment.enrollmentMode)
                      ? courseToEdit.settings.enrollment.enrollmentMode
                      : "free") as "free" | "buy" | "recurring",
                  }
                : courseData.settings.enrollment,
              certificate: courseToEdit.settings.certificate
                ? {
                    certificateEnabled: courseToEdit.settings.certificate.certificateEnabled ?? courseData.settings.certificate.certificateEnabled,
                    certificateTemplate: courseToEdit.settings.certificate.certificateTemplate ?? courseData.settings.certificate.certificateTemplate,
                    certificateDescription: courseToEdit.settings.certificate.certificateDescription ?? courseData.settings.certificate.certificateDescription,
                    signatureImage: courseToEdit.settings.certificate.signatureImage ?? courseData.settings.certificate.signatureImage,
                    signatureTitle: courseToEdit.settings.certificate.signatureTitle ?? courseData.settings.certificate.signatureTitle,
                    additionalText: courseToEdit.settings.certificate.additionalText ?? courseData.settings.certificate.additionalText,
                    certificateType: courseToEdit.settings.certificate.certificateType ?? courseData.settings.certificate.certificateType,
                  }
                : courseData.settings.certificate,
              currency: courseToEdit.settings.currency ?? courseData.settings.currency,
            }),
          },
        })
      }
    }
  }, [searchParams, courseData.settings])

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
    }
  }

  const handlePublishCourse = async () => {
    // Validate required fields
    if (!courseData.basicInfo.title || !courseData.basicInfo.description) {
      toast.error("Please fill in all required fields")
      return
    }

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
    }
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
            variant="outline" 
            onClick={handleSaveDraft}
          >
            Save to Draft
          </Button>
          <Button onClick={handlePublishCourse}>Publish</Button>
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

export default function NewCoursePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewCourseContent />
    </Suspense>
  )
}
