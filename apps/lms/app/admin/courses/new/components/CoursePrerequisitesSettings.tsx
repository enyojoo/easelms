"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface CoursePrerequisitesSettingsProps {
  prerequisitesEnabled: boolean
  prerequisiteCourseIds: number[]
  onUpdate: (enabled: boolean, courseIds: number[]) => void
  courseId?: string | number
}

interface Course {
  id: number
  title: string
}

export default function CoursePrerequisitesSettings({
  prerequisitesEnabled,
  prerequisiteCourseIds,
  onUpdate,
  courseId,
}: CoursePrerequisitesSettingsProps) {
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")

  // Fetch available courses (exclude current course)
  useEffect(() => {
    const fetchCourses = async () => {
      if (!prerequisitesEnabled) return

      setLoading(true)
      try {
        const response = await fetch("/api/courses?all=true")
        if (!response.ok) {
          throw new Error("Failed to fetch courses")
        }

        const data = await response.json()
        const courses = (data.courses || []).filter((course: any) => {
          // Exclude current course if editing
          if (courseId && course.id === Number(courseId)) {
            return false
          }
          // Only show published courses
          return course.is_published || course.settings?.isPublished
        })

        setAvailableCourses(courses)
      } catch (error: any) {
        console.error("Error fetching courses:", error)
        toast.error(error?.message || "Failed to load courses")
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [prerequisitesEnabled, courseId])

  const handleToggle = (enabled: boolean) => {
    if (!enabled) {
      // Clear prerequisites when disabling
      onUpdate(false, [])
    } else {
      onUpdate(true, prerequisiteCourseIds)
    }
  }

  const handleAddPrerequisite = () => {
    if (!selectedCourseId) return

    const courseIdNum = Number(selectedCourseId)
    if (courseIdNum && !prerequisiteCourseIds.includes(courseIdNum)) {
      onUpdate(prerequisitesEnabled, [...prerequisiteCourseIds, courseIdNum])
      setSelectedCourseId("")
    }
  }

  const handleRemovePrerequisite = (courseIdToRemove: number) => {
    onUpdate(
      prerequisitesEnabled,
      prerequisiteCourseIds.filter((id) => id !== courseIdToRemove)
    )
  }

  const getPrerequisiteTitle = (id: number): string => {
    const course = availableCourses.find((c) => c.id === id)
    return course ? course.title : `Course ${id}`
  }

  // Filter out already selected courses from dropdown
  const availableForSelection = availableCourses.filter(
    (course) => !prerequisiteCourseIds.includes(course.id)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Require Prerequisites</Label>
          <p className="text-sm text-muted-foreground">
            Require learners to complete other courses before enrolling in this course
          </p>
        </div>
        <Switch checked={prerequisitesEnabled} onCheckedChange={handleToggle} />
      </div>

      {prerequisitesEnabled && (
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label>Prerequisite Courses</Label>
            <div className="flex gap-2">
              <Select 
                value={selectedCourseId || undefined} 
                onValueChange={setSelectedCourseId}
                disabled={loading || availableForSelection.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={
                    loading 
                      ? "Loading courses..." 
                      : availableForSelection.length === 0
                      ? (prerequisiteCourseIds.length > 0
                          ? "All available courses are already selected"
                          : "No courses available")
                      : "Select a course..."
                  } />
                </SelectTrigger>
                {availableForSelection.length > 0 && (
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    collisionPadding={8}
                    avoidCollisions={true}
                  >
                    {availableForSelection.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title} (ID: {course.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                )}
              </Select>
              <Button
                type="button"
                onClick={handleAddPrerequisite}
                disabled={!selectedCourseId || loading}
              >
                Add
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Select courses that must be completed before learners can enroll in this course
            </p>
          </div>

          {prerequisiteCourseIds.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Prerequisites</Label>
              <div className="flex flex-wrap gap-2">
                {prerequisiteCourseIds.map((id) => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {getPrerequisiteTitle(id)}
                    <button
                      type="button"
                      onClick={() => handleRemovePrerequisite(id)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
