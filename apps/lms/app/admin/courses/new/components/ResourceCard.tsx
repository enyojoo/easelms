"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Trash2, Link as LinkIcon, FileUp, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import FileUpload from "@/components/FileUpload"
import { Resource } from "./ResourceManager"

interface ResourceCardProps {
  resource: Resource
  onUpdate: (updates: Partial<Resource>) => void
  onDelete: () => void
  lessonId?: string
}

export default function ResourceCard({ resource, onUpdate, onDelete, lessonId }: ResourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card className="border w-full">
      <CardHeader className="pb-3 overflow-hidden">
        <div className="flex items-center justify-between gap-2 w-full overflow-hidden">
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            {resource.type === "document" ? (
              <FileUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{resource.title || "Untitled Resource"}</p>
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
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={onDelete} title="Delete" className="h-9 w-9">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-9 w-9">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded}>
        <CollapsibleContent className="overflow-hidden">
          <CardContent className="space-y-4 pt-0 w-full overflow-hidden">
            <div className="space-y-2 w-full overflow-hidden">
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', minWidth: 0 }}>
                  <input
                    value={resource.url}
                    onChange={(e) => onUpdate({ url: e.target.value })}
                    placeholder="https://example.com"
                    type="url"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: '40px',
                      padding: '8px 12px',
                      border: '1px solid hsl(var(--input))',
                      borderRadius: '6px',
                      backgroundColor: 'hsl(var(--background))',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      width: '100%'
                    }}
                  />
                  {resource.url && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(resource.url, "_blank")}
                      title="Open in new tab"
                      style={{ flexShrink: 0 }}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 w-full overflow-hidden">
                <Label>File</Label>
                <div className="w-full overflow-hidden">
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
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

