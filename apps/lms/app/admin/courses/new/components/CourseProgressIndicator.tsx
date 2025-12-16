"use client"

import { CheckCircle2, Circle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { validateCourseData, type CourseData } from "./CourseValidation"

interface CourseProgressIndicatorProps {
  courseData: CourseData
}

export default function CourseProgressIndicator({ courseData }: CourseProgressIndicatorProps) {
  const validation = validateCourseData(courseData)

  const checklistItems = [
    {
      label: "Basic Information",
      completed: validation.completionStatus.basicInfo,
      errors: validation.errors["basicInfo.title"] || validation.errors["basicInfo.description"] || [],
    },
    {
      label: "Lessons",
      completed: validation.completionStatus.lessons,
      errors: [],
    },
    {
      label: "Settings",
      completed: validation.completionStatus.settings,
      errors: validation.errors["settings.enrollment"] || [],
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Course Progress</h3>
          <p className="text-xs text-muted-foreground">{validation.progressPercentage}% Complete</p>
        </div>
        {validation.readyToPublish && (
          <Badge variant="default" className="bg-green-500">
            Ready to Publish
          </Badge>
        )}
      </div>

      <Progress value={validation.progressPercentage} className="h-2" />

      <div className="space-y-2">
        {checklistItems.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            {item.completed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${item.completed ? "text-foreground" : "text-muted-foreground"}`}>
                {item.label}
              </p>
              {item.errors.length > 0 && (
                <div className="mt-1 space-y-1">
                  {item.errors.map((error, errorIndex) => (
                    <p key={errorIndex} className="text-xs text-destructive">
                      {error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!validation.isValid && Object.keys(validation.errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the errors above before publishing the course.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

