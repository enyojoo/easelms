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
import { modules } from "@/app/data/courses"

function NewCourseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [courseData, setCourseData] = useState({
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
            ...courseToEdit.settings,
          },
        })
      }
    }
  }, [searchParams, courseData.settings])

  const updateCourseData = useCallback((section: string, data: any) => {
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
    console.log("Saving course:", courseData)
    router.push("/admin/courses")
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
