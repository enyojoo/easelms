"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import CourseEnrollmentSettings from "./CourseEnrollmentSettings"
import CourseCertificateSettings from "./CourseCertificateSettings"
import CoursePrerequisitesSettings from "./CoursePrerequisitesSettings"
import CourseInstructorSettings from "./CourseInstructorSettings"

interface CourseSettingsProps {
  settings: {
    isPublished: boolean
    requiresSequentialProgress: boolean
    minimumQuizScore: number
    enrollment: {
      enrollmentMode: "free" | "buy"
      price?: number
    }
    certificate: {
      certificateEnabled: boolean
      certificateTemplate: string
      certificateDescription: string
      signatureImage: string
      signatureName?: string
      signatureTitle?: string
      additionalText?: string
      certificateType: "completion" | "participation" | "achievement"
    }
    prerequisites?: {
      enabled: boolean
      courseIds: number[]
    }
    instructor?: {
      instructorEnabled: boolean
      instructorIds: string[]
    }
  }
  onUpdate: (settings: any) => void
  courseId?: string | number
  instructors?: Array<{
    id: string
    name: string
    image?: string | null
    bio?: string | null
  }>
  onInstructorsChange?: (instructors: Array<{ id: string; name: string; image?: string | null; bio?: string | null }>) => void
}

export default function CourseSettings({ settings, onUpdate, courseId, instructors, onInstructorsChange }: CourseSettingsProps) {
  const handleSwitchChange = (field: string, checked: boolean) => {
    onUpdate({ ...settings, [field]: checked })
  }

  const handleInputChange = (field: string, value: string | number) => {
    onUpdate({ ...settings, [field]: value })
  }

  const handleSectionUpdate = (section: "enrollment" | "certificate" | "prerequisites" | "instructor", data: any) => {
    onUpdate({
      ...settings,
      [section]: { ...settings[section], ...data },
    })
  }

  const handlePrerequisitesUpdate = (enabled: boolean, courseIds: number[]) => {
    onUpdate({
      ...settings,
      prerequisites: {
        enabled,
        courseIds,
      },
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Basic Settings</h3>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Published</Label>
            <p className="text-sm text-muted-foreground">Make this course available to students</p>
          </div>
          <Switch
            checked={settings.isPublished}
            onCheckedChange={(checked) => handleSwitchChange("isPublished", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Sequential Progress</Label>
            <p className="text-sm text-muted-foreground">Require students to complete lessons in order</p>
          </div>
          <Switch
            checked={settings.requiresSequentialProgress}
            onCheckedChange={(checked) => handleSwitchChange("requiresSequentialProgress", checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Minimum Quiz Score (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={settings.minimumQuizScore}
            onChange={(e) => handleInputChange("minimumQuizScore", Number(e.target.value))}
          />
          <p className="text-sm text-muted-foreground">
            Minimum score required to pass quizzes and progress to next lesson
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Enrollment Settings</h3>
        <CourseEnrollmentSettings
          settings={settings.enrollment}
          onUpdate={(data) => handleSectionUpdate("enrollment", data)}
        />
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Prerequisites Settings</h3>
        <CoursePrerequisitesSettings
          prerequisitesEnabled={settings.prerequisites?.enabled || false}
          prerequisiteCourseIds={settings.prerequisites?.courseIds || []}
          onUpdate={handlePrerequisitesUpdate}
          courseId={courseId}
        />
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Certificate Settings</h3>
        <CourseCertificateSettings
          settings={settings.certificate}
          onUpdate={(data) => handleSectionUpdate("certificate", data)}
          courseId={courseId}
        />
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Instructor Settings</h3>
        <CourseInstructorSettings
          settings={settings.instructor || { instructorEnabled: false, instructorIds: [] }}
          onUpdate={(data) => handleSectionUpdate("instructor", data)}
          courseId={courseId}
          instructors={instructors}
          onInstructorsChange={onInstructorsChange}
        />
      </div>
    </div>
  )
}
