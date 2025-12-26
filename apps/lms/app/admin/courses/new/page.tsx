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
    if (!editCourseId) {
      const draft = loadDraft()
      if (draft) {
        setCourseData(draft)
      }
    }
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

  const handleSaveCourse = async () => {
    // Validate required fields
    if (!courseData.basicInfo.title || !courseData.basicInfo.description) {
      toast.error("Please fill in all required fields")
      return
    }

    // Clear draft on successful save
    clearDraft()

    // Mock save - in real app, this would call an API
    console.log("Saving course:", courseData)
    toast.success(searchParams?.get("edit") ? "Course updated successfully" : "Course created successfully")
    setTimeout(() => {
      router.push("/admin/courses")
    }, 1000)
  }


  return (
    <div className="pt-4 md:pt-8 pb-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              clearDraft()
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
            onClick={() => {
              clearDraft()
              router.push("/admin/courses")
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveCourse}>{searchParams?.get("edit") ? "Save" : "Create"}</Button>
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
