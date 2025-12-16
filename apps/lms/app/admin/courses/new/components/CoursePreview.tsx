"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Video, FileText, HelpCircle, Eye, Award } from "lucide-react"
import Image from "next/image"
import InteractivePreview from "./InteractivePreview"
import QuizPreview from "./QuizPreview"

interface CoursePreviewProps {
  courseData: any
}

export default function CoursePreview({ courseData }: CoursePreviewProps) {
  const [previewMode, setPreviewMode] = useState<"overview" | "interactive" | "quiz" | "certificate">("overview")
  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />
      case "text":
        return <FileText className="w-4 h-4" />
      case "quiz":
        return <HelpCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  const allQuizQuestions = courseData.lessons
    .filter((lesson: any) => lesson.quiz?.enabled && lesson.quiz?.questions?.length > 0)
    .flatMap((lesson: any) => lesson.quiz.questions)

  return (
    <div className="space-y-6">
      <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Eye className="w-4 h-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="interactive">
            <Video className="w-4 h-4 mr-2" /> Interactive
          </TabsTrigger>
          <TabsTrigger value="quiz" disabled={allQuizQuestions.length === 0}>
            <HelpCircle className="w-4 h-4 mr-2" /> Quiz
          </TabsTrigger>
          <TabsTrigger value="certificate" disabled={!courseData.settings?.certificate?.certificateEnabled}>
            <Award className="w-4 h-4 mr-2" /> Certificate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="aspect-video relative rounded-lg overflow-hidden">
            <Image
              src={courseData.basicInfo.thumbnail || "/placeholder.svg?height=200&width=300"}
              alt={courseData.basicInfo.title}
              fill
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold">{courseData.basicInfo.title}</h2>
            <p className="text-muted-foreground mt-2">{courseData.basicInfo.description}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseData.lessons.map((lesson: any, index: number) => (
                  <div key={lesson.id} className="flex items-center gap-4 p-4 rounded-lg border">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                      {getLessonIcon(lesson.type)}
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium">{lesson.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)} Lesson
                      </p>
                    </div>
                    {lesson.settings.isRequired && <Badge variant="secondary">Required</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactive">
          <InteractivePreview courseData={courseData} />
        </TabsContent>

        <TabsContent value="quiz">
          {allQuizQuestions.length > 0 ? (
            <QuizPreview
              questions={allQuizQuestions}
              passingScore={courseData.settings?.minimumQuizScore || 70}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>No quiz questions available for preview</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="certificate">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                <Award className="w-16 h-16 mx-auto text-primary" />
                <h3 className="text-2xl font-bold">Certificate of Completion</h3>
                <p className="text-lg">
                  This is to certify that <span className="font-semibold">[Student Name]</span> has successfully
                  completed
                </p>
                <h4 className="text-xl font-semibold">{courseData.basicInfo.title}</h4>
                {courseData.settings?.certificate?.certificateDescription && (
                  <p className="text-muted-foreground">
                    {courseData.settings.certificate.certificateDescription.replace(
                      "[student_name]",
                      "[Student Name]"
                    )}
                  </p>
                )}
                <div className="mt-8 flex justify-between items-end">
                  <div>
                    {courseData.settings?.certificate?.signatureImage && (
                      <Image
                        src={courseData.settings.certificate.signatureImage}
                        alt="Signature"
                        width={100}
                        height={50}
                        className="object-contain"
                      />
                    )}
                    <p className="text-sm mt-2">
                      {courseData.settings?.certificate?.signatureTitle || "Course Instructor"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
                {courseData.settings?.certificate?.additionalText && (
                  <p className="text-xs text-muted-foreground mt-4">
                    {courseData.settings.certificate.additionalText}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
