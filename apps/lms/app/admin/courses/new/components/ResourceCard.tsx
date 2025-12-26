"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Trash2, Link as LinkIcon, FileUp, ChevronDown, ChevronUp, Eye, ExternalLink } from "lucide-react"
import FileUpload from "@/components/FileUpload"
import ResourcePreview from "./ResourcePreview"
import { Resource } from "./ResourceManager"

interface ResourceCardProps {
  resource: Resource
  onUpdate: (updates: Partial<Resource>) => void
  onDelete: () => void
  lessonId?: string
}

export default function ResourceCard({ resource, onUpdate, onDelete, lessonId }: ResourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {resource.type === "document" ? (
              <FileUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{resource.title || "Untitled Resource"}</p>
              {resource.url && (
                <p className="text-xs text-muted-foreground truncate">{resource.url}</p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {resource.type}
            </Badge>
            {resource.fileSize && (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {formatFileSize(resource.fileSize)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {resource.url && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreview(true)}
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label>Resource Title</Label>
              <Input
                value={resource.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Enter resource title"
              />
            </div>

            {resource.type === "link" ? (
              <div className="space-y-2">
                <Label>URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={resource.url}
                    onChange={(e) => onUpdate({ url: e.target.value })}
                    placeholder="https://example.com"
                    type="url"
                  />
                  {resource.url && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(resource.url, "_blank")}
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>File</Label>
                <FileUpload
                  type="document"
                  bucket="course-documents"
                  accept="application/pdf,.doc,.docx,.txt,.zip,image/*"
                  maxSize={50 * 1024 * 1024}
                  multiple={false}
                  additionalPath={lessonId ? `lesson-${lessonId}` : undefined}
                  initialValue={resource.url || undefined}
                  onUploadComplete={(files, urls) => {
                    if (urls.length > 0) {
                      onUpdate({
                        url: urls[0],
                        fileSize: files[0]?.size,
                      })
                    }
                  }}
                  onRemove={() => {
                    onUpdate({
                      url: "",
                      fileSize: undefined,
                    })
                  }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={resource.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Describe what this resource contains..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Category/Tag (optional)</Label>
              <Input
                value={resource.category || ""}
                onChange={(e) => onUpdate({ category: e.target.value })}
                placeholder="e.g., Reading Material, Reference, Exercise"
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {showPreview && resource.url && (
        <ResourcePreview
          resource={resource}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Card>
  )
}

