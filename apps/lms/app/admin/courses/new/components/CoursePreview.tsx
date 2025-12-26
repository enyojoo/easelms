"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, FileText } from "lucide-react"
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
        <h2 className="text-2xl font-bold">{courseData.basicInfo.title || "Untitled Course"}</h2>
        {courseData.basicInfo.description && (
          <div 
            className="text-muted-foreground mt-2 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: courseData.basicInfo.description }}
          />
        )}
      </div>

      {courseData.basicInfo.whoIsThisFor && (
        <Card>
          <CardHeader>
            <CardTitle>Who this course is for</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-muted-foreground prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: courseData.basicInfo.whoIsThisFor }}
            />
          </CardContent>
        </Card>
      )}

      {courseData.basicInfo.requirements && (
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-muted-foreground prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: courseData.basicInfo.requirements }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Course Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courseData.lessons.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No lessons added yet</p>
            ) : (
              courseData.lessons.map((lesson: any, index: number) => (
                <div key={lesson.id} className="flex items-center gap-4 p-4 rounded-lg border">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    {getLessonIcon(lesson.type)}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-medium">{lesson.title || `Lesson ${index + 1}`}</h3>
                    <p className="text-sm text-muted-foreground">
                      {lesson.type ? lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1) + " Lesson" : "Lesson"}
                    </p>
                  </div>
                  {lesson.settings?.isRequired && <Badge variant="secondary">Required</Badge>}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
