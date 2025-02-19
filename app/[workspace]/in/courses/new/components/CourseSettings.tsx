"use client"

import { useState, useEffect, useCallback } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import CourseEnrollmentSettings from "./CourseEnrollmentSettings"
import CourseAccessSettings from "./CourseAccessSettings"
import CourseCertificateSettings from "./CourseCertificateSettings"
import { debounce } from "lodash"

interface CourseSettingsProps {
  settings: {
    isPublished: boolean
    requiresSequentialProgress: boolean
    minimumQuizScore: number
    enrollment: {
      enrollmentMode: "open" | "free" | "buy" | "recurring" | "closed"
      price?: number
      recurringPrice?: number
    }
    access: {
      requirementType: "none" | "prerequisites" | "points"
      prerequisites?: string[]
      requiredPoints?: number
      hasExpiration: boolean
      startDate?: string
      endDate?: string
      studentLimit: number
    }
    certificate: {
      certificateEnabled: boolean
      certificateTemplate: string
      certificateTitle: string
      certificateDescription: string
      signatureImage: string
      signatureTitle?: string
      additionalText?: string
      certificateType: "completion" | "achievement" | "participation"
    }
    workshopsEnabled: boolean
    numberOfWorkshops: number
  }
  courses: { id: string; title: string }[]
  onUpdate: (settings: any) => void
}

export default function CourseSettings({ settings, courses, onUpdate }: CourseSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)

  const debouncedUpdate = useCallback(
    debounce((newSettings) => {
      onUpdate(newSettings)
    }, 300),
    [], // Fixed: Removed unnecessary dependencies
  )

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const updateSettings = useCallback(
    (newSettings: Partial<typeof settings>) => {
      setLocalSettings((prev) => {
        const updated = { ...prev, ...newSettings }
        debouncedUpdate(updated)
        return updated
      })
    },
    [debouncedUpdate],
  )

  const handleSwitchChange = useCallback(
    (field: string, checked: boolean) => {
      updateSettings({ [field]: checked })
    },
    [updateSettings],
  )

  const handleInputChange = useCallback(
    (field: string, value: string | number) => {
      updateSettings({ [field]: value })
    },
    [updateSettings],
  )

  const handleSectionUpdate = useCallback(
    (section: string, data: any) => {
      updateSettings({ [section]: { ...localSettings[section], ...data } })
    },
    [localSettings, updateSettings],
  )

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
            checked={localSettings.isPublished}
            onCheckedChange={(checked) => handleSwitchChange("isPublished", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Sequential Progress</Label>
            <p className="text-sm text-muted-foreground">Require students to complete lessons in order</p>
          </div>
          <Switch
            checked={localSettings.requiresSequentialProgress}
            onCheckedChange={(checked) => handleSwitchChange("requiresSequentialProgress", checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Minimum Quiz Score (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={localSettings.minimumQuizScore}
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
          settings={localSettings.enrollment}
          onUpdate={(data) => handleSectionUpdate("enrollment", data)}
        />
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Access Settings</h3>
        <CourseAccessSettings
          settings={localSettings.access}
          courses={courses}
          onUpdate={(data) => handleSectionUpdate("access", data)}
        />
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Workshop Settings</h3>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Workshops</Label>
            <p className="text-sm text-muted-foreground">Allow workshops for this course</p>
          </div>
          <Switch
            checked={localSettings.workshopsEnabled}
            onCheckedChange={(checked) => handleSwitchChange("workshopsEnabled", checked)}
          />
        </div>
        {localSettings.workshopsEnabled && (
          <div className="space-y-2">
            <Label>Number of Workshops</Label>
            <Input
              type="number"
              min="0"
              value={localSettings.numberOfWorkshops}
              onChange={(e) => handleInputChange("numberOfWorkshops", Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Certificate Settings</h3>
        <CourseCertificateSettings
          settings={localSettings.certificate}
          onUpdate={(data) => handleSectionUpdate("certificate", data)}
        />
      </div>
    </div>
  )
}

