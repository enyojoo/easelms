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
import { modules } from "@/data/courses"

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
        enrollmentMode: "open" | "free" | "buy" | "recurring" | "closed"
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

  useEffect(() => {
    const editCourseId = searchParams?.get("edit")
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

    // Mock save - in real app, this would call an API
    console.log("Saving course:", courseData)
    toast.success(searchParams?.get("edit") ? "Course updated successfully" : "Course created successfully")
    setTimeout(() => {
      router.push("/admin/courses")
    }, 1000)
  }


  return (
    <div className="pt-4 md:pt-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">{searchParams?.get("edit") ? "Edit Course" : "New Course"}</h1>
        <div className="space-x-1 flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => router.push("/admin/courses")}>
            Cancel
          </Button>
          <Button onClick={handleSaveCourse}>{searchParams?.get("edit") ? "Save" : "Create"}</Button>
        </div>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <CourseBasicInfo data={courseData.basicInfo} onUpdate={(data) => updateCourseData("basicInfo", data)} />
          </TabsContent>

          <TabsContent value="lessons" className="space-y-4">
            <LessonBuilder lessons={courseData.lessons} onUpdate={(lessons) => updateCourseData("lessons", lessons)} />
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
  )
}

export default function NewCoursePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewCourseContent />
    </Suspense>
  )
}
