"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface CourseEnrollmentSettingsProps {
  settings: {
    enrollmentMode: "free" | "buy" | "recurring"
    price?: number
    recurringPrice?: number
  }
  onUpdate: (settings: any) => void
}

export default function CourseEnrollmentSettings({ settings, onUpdate }: CourseEnrollmentSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Enrollment Mode</Label>
        <RadioGroup
          value={settings.enrollmentMode}
          onValueChange={(value: "free" | "buy" | "recurring") =>
            onUpdate({ ...settings, enrollmentMode: value })
          }
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="free" id="free" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="free">Free</Label>
              <p className="text-sm text-muted-foreground">
                The course is free. Registration and enrollment are required in order to access the content.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="buy" id="buy" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="buy">Paid</Label>
              <p className="text-sm text-muted-foreground">
                Students need to purchase the course (one-time fee) in order to gain access.
              </p>
              {settings.enrollmentMode === "buy" && (
                <Input
                  type="number"
                  placeholder="Price"
                  value={settings.price || ""}
                  onChange={(e) => onUpdate({ ...settings, price: Number.parseFloat(e.target.value) || 0 })}
                  className="mt-2 w-32"
                />
              )}
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="recurring" id="recurring" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="recurring">Subscription</Label>
              <p className="text-sm text-muted-foreground">
                Students need to subscribe to the course (recurring monthly fee) in order to gain access.
              </p>
              {settings.enrollmentMode === "recurring" && (
                <Input
                  type="number"
                  placeholder="Monthly Price"
                  value={settings.recurringPrice || ""}
                  onChange={(e) => onUpdate({ ...settings, recurringPrice: Number.parseFloat(e.target.value) || 0 })}
                  className="mt-2 w-32"
                />
              )}
            </div>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}
