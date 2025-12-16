"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import CourseBasicInfo from "./components/CourseBasicInfo"
import LessonBuilder from "./components/LessonBuilder"
import CourseSettings from "./components/CourseSettings"
import CoursePreview from "./components/CoursePreview"
import CourseProgressIndicator from "./components/CourseProgressIndicator"
import CourseSections from "./components/CourseSections"
import CourseTemplates from "./components/CourseTemplates"
import TemplateSelector from "./components/TemplateSelector"
import { useAutoSave } from "./hooks/useAutoSave"
import { modules } from "@/data/courses"
import { Clock } from "lucide-react"

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
      tags?: string[]
      learningObjectives?: string[]
      outcomes?: string[]
      prerequisites?: number[]
      estimatedDuration?: number
      difficulty?: string
      language?: string
      instructorId?: string
    }
    sections?: Array<{
      id: string
      title: string
      description: string
      order: number
      lessons: string[]
    }>
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
    sections: [],
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
  
  // Auto-save hook
  const { lastSaved, loadDraft, clearDraft, saveNow } = useAutoSave({
    data: courseData,
    courseId: editCourseId || "new",
    enabled: true,
  })

  // Load draft or template on mount
  useEffect(() => {
    if (!editCourseId) {
      const templateId = searchParams?.get("template")
      if (templateId) {
        // Load from template - would need to fetch from template storage
        // For now, just check draft
      }
      const draft = loadDraft()
      if (draft) {
        const shouldLoad = window.confirm("A draft was found. Would you like to restore it?")
        if (shouldLoad) {
          setCourseData(draft as typeof courseData)
        }
      }
    }
  }, [editCourseId, loadDraft, searchParams])


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
              passingScore: 70,
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
                    enrollmentMode: courseToEdit.settings.enrollment.enrollmentMode as "open" | "free" | "buy" | "recurring" | "closed",
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
    <div className="pt-4 md:pt-8">
      <div className="flex justify-between items-start mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {searchParams?.get("edit") ? "Edit Course" : "New Course"}
          </h1>
          {lastSaved && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="space-x-2 flex items-center">
          {!editCourseId && (
            <>
              <TemplateSelector
                onSelect={(templateData) => {
                  setCourseData(templateData)
                  toast.success("Template loaded")
                }}
              />
              <CourseTemplates courseData={courseData} />
            </>
          )}
          <Button variant="outline" onClick={saveNow}>
            Save Draft
          </Button>
          <Button variant="outline" onClick={() => router.push("/admin/courses")}>
            Cancel
          </Button>
          <Button onClick={handleSaveCourse}>{searchParams?.get("edit") ? "Save" : "Create"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-1">
          <Card className="p-4">
            <CourseProgressIndicator courseData={courseData} />
          </Card>
        </div>
        <div className="lg:col-span-3">

          <Card className="p-6">
            <Tabs defaultValue="basic" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="lessons">Lessons</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <CourseBasicInfo
              data={courseData.basicInfo}
              onUpdate={(data) => updateCourseData("basicInfo", data)}
              availableCourses={modules.map((m) => ({ id: m.id, title: m.title }))}
            />
          </TabsContent>

          <TabsContent value="lessons" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Course Sections</h3>
                <CourseSections
                  sections={courseData.sections || []}
                  lessons={courseData.lessons.map((l) => ({ id: l.id, title: l.title }))}
                  onChange={(sections) => updateCourseData("sections", sections)}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Lessons</h3>
                <LessonBuilder lessons={courseData.lessons} onUpdate={(lessons) => updateCourseData("lessons", lessons)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <CourseSettings
              settings={courseData.settings}
              onUpdate={(settings) => updateCourseData("settings", settings)}
            />
          </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                <CoursePreview courseData={courseData} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
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
