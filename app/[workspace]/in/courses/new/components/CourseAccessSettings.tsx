"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CourseAccessSettingsProps {
  settings: {
    requirementType: "none" | "prerequisites" | "points"
    prerequisites?: string[]
    requiredPoints?: number
    hasExpiration: boolean
    startDate?: string
    endDate?: string
    learnerLimit: number
  }
  courses: { id: string; title: string }[]
  onUpdate: (settings: any) => void
}

export default function CourseAccessSettings({ settings, courses, onUpdate }: CourseAccessSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Requirements for Enrollment</Label>
        <RadioGroup
          value={settings.requirementType}
          onValueChange={(value: "none" | "prerequisites" | "points") =>
            onUpdate({ ...settings, requirementType: value })
          }
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="none" id="none" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="none">None</Label>
              <p className="text-sm text-muted-foreground">
                Learners will have access to course content without prerequisite restrictions.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="prerequisites" id="prerequisites" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="prerequisites">Prerequisite Courses</Label>
              <p className="text-sm text-muted-foreground">
                Courses that a learner must complete before enrolling in this course.
              </p>
              {settings.requirementType === "prerequisites" && (
                <Select
                  value={settings.prerequisites?.[0]}
                  onValueChange={(value) => onUpdate({ ...settings, prerequisites: [value] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select prerequisite course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="points" id="points" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="points">Course Points</Label>
              <p className="text-sm text-muted-foreground">
                Number of Course Points required to gain access to this course.
              </p>
              {settings.requirementType === "points" && (
                <Input
                  type="number"
                  value={settings.requiredPoints}
                  onChange={(e) => onUpdate({ ...settings, requiredPoints: Number.parseInt(e.target.value) })}
                  className="w-32"
                />
              )}
            </div>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Course Access Expiration</Label>
            <p className="text-sm text-muted-foreground">Set a time limit for course access</p>
          </div>
          <Switch
            checked={settings.hasExpiration}
            onCheckedChange={(checked) => onUpdate({ ...settings, hasExpiration: checked })}
          />
        </div>

        {settings.hasExpiration && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={settings.startDate}
                onChange={(e) => onUpdate({ ...settings, startDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={settings.endDate}
                onChange={(e) => onUpdate({ ...settings, endDate: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Learner Limit</Label>
        <Input
          type="number"
          min="0"
          value={settings.learnerLimit}
          onChange={(e) => onUpdate({ ...settings, learnerLimit: Number.parseInt(e.target.value) })}
          placeholder="0 for unlimited"
        />
        <p className="text-sm text-muted-foreground">Maximum number of learners that can enroll (0 for unlimited)</p>
      </div>
    </div>
  )
}

