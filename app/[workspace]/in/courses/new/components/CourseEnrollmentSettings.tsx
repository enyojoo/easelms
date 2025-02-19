"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface CourseEnrollmentSettingsProps {
  settings: {
    enrollmentMode: "open" | "free" | "buy" | "recurring" | "closed"
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
          onValueChange={(value: "open" | "free" | "buy" | "recurring" | "closed") =>
            onUpdate({ ...settings, enrollmentMode: value })
          }
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="open" id="open" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="open">Open</Label>
              <p className="text-sm text-muted-foreground">
                The course is not protected. Any student can access its content without the need to be logged-in or
                enrolled.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="free" id="free" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="free">Free</Label>
              <p className="text-sm text-muted-foreground">
                The course is protected. Registration and enrollment are required in order to access the content.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="buy" id="buy" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="buy">Buy Now</Label>
              <p className="text-sm text-muted-foreground">
                Students need to purchase the course (one-time fee) in order to gain access.
              </p>
              {settings.enrollmentMode === "buy" && (
                <Input
                  type="number"
                  placeholder="Price"
                  value={settings.price}
                  onChange={(e) => onUpdate({ ...settings, price: Number.parseFloat(e.target.value) })}
                  className="mt-2 w-32"
                />
              )}
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="recurring" id="recurring" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="recurring">Recurring</Label>
              <p className="text-sm text-muted-foreground">
                Students need to purchase the course (recurring fee) in order to gain access.
              </p>
              {settings.enrollmentMode === "recurring" && (
                <Input
                  type="number"
                  placeholder="Monthly Price"
                  value={settings.recurringPrice}
                  onChange={(e) => onUpdate({ ...settings, recurringPrice: Number.parseFloat(e.target.value) })}
                  className="mt-2 w-32"
                />
              )}
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="closed" id="closed" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="closed">Closed</Label>
              <p className="text-sm text-muted-foreground">
                The course can only be accessed through admin enrollment (manual), group enrollment, or integration
                enrollment.
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}

