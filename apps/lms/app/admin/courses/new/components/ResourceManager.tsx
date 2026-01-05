"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, FileUp, Link as LinkIcon, Eye, FileText, Image as ImageIcon } from "lucide-react"
import FileUpload from "@/components/FileUpload"
import ResourceCard from "./ResourceCard"

export interface Resource {
  id: string
  type: "document" | "link"
  title: string
  url: string
  description?: string
  category?: string
  fileSize?: number
}

interface ResourceManagerProps {
  resources: Resource[]
  onChange: (resources: Resource[]) => void
  lessonId?: string
  courseId?: string | number
}

export default function ResourceManager({ resources, onChange, lessonId, courseId }: ResourceManagerProps) {
  const [newResourceType, setNewResourceType] = useState<"document" | "link">("link")

  const addResource = (type: "document" | "link") => {
    const newResource: Resource = {
      id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: "",
      url: "",
      description: "",
    }
    onChange([...resources, newResource])
  }

  const updateResource = (resourceId: string, updates: Partial<Resource>) => {
    onChange(resources.map((r) => (r.id === resourceId ? { ...r, ...updates } : r)))
  }

  const removeResource = (resourceId: string) => {
    onChange(resources.filter((r) => r.id !== resourceId))
  }

  const getFileTypeIcon = (url: string) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return ImageIcon
    if (url.match(/\.(pdf)$/i)) return FileText
    return FileUp
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Resources</Label>
          <p className="text-sm text-muted-foreground">
            Add files, documents, or links to supplement the lesson content
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => addResource("link")} className="w-32">
            <LinkIcon className="w-4 h-4 mr-2" /> Add Link
          </Button>
          <Button variant="outline" size="sm" onClick={() => addResource("document")} className="w-32">
            <FileUp className="w-4 h-4 mr-2" /> Add File
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onUpdate={(updates) => updateResource(resource.id, updates)}
            onDelete={() => removeResource(resource.id)}
            lessonId={lessonId}
            courseId={courseId}
            resourceId={resource.id}
          />
        ))}
      </div>

      {resources.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No resources added yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add files or links to provide additional learning materials
          </p>
        </Card>
      )}
    </div>
  )
}

