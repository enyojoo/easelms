"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, FileText, HelpCircle } from "lucide-react"
import Image from "next/image"

interface CoursePreviewProps {
  courseData: any
}

export default function CoursePreview({ courseData }: CoursePreviewProps) {
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

  return (
    <div className="space-y-6">
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
    </div>
  )
}

