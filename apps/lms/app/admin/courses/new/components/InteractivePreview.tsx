"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Smartphone, Monitor } from "lucide-react"
import CoursePreview from "./CoursePreview"

interface InteractivePreviewProps {
  courseData: any
}

export default function InteractivePreview({ courseData }: InteractivePreviewProps) {
  const [isMobile, setIsMobile] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Label>Preview Mode</Label>
          <div className="flex items-center gap-2">
            <Button
              variant={!isMobile ? "default" : "outline"}
              size="sm"
              onClick={() => setIsMobile(false)}
            >
              <Monitor className="w-4 h-4 mr-2" /> Desktop
            </Button>
            <Button
              variant={isMobile ? "default" : "outline"}
              size="sm"
              onClick={() => setIsMobile(true)}
            >
              <Smartphone className="w-4 h-4 mr-2" /> Mobile
            </Button>
          </div>
        </div>
      </div>

      <div
        className={`border-2 rounded-lg overflow-hidden ${
          isMobile ? "max-w-sm mx-auto" : "w-full"
        }`}
        style={isMobile ? { width: "375px", minHeight: "667px" } : {}}
      >
        <div className="bg-muted p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="text-xs text-muted-foreground">
            {isMobile ? "Mobile Preview" : "Desktop Preview"}
          </div>
        </div>
        <div className={`bg-background ${isMobile ? "p-4" : "p-6"}`}>
          <CoursePreview courseData={courseData} />
        </div>
      </div>
    </div>
  )
}

