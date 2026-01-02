"use client"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import RichTextEditor from "./RichTextEditor"
import FileUpload from "@/components/FileUpload"
import VideoPreviewPlayer from "@/components/VideoPreviewPlayer"

interface LessonContentEditorProps {
  type: "video" | "text"
  content: any
  onChange: (content: any) => void
}

export default function LessonContentEditor({ type, content, onChange }: LessonContentEditorProps) {
  // Sync content.url with FileUpload component
  useEffect(() => {
    // If content.url exists but is empty, clear it
    if (content.url === "") {
      onChange({
        ...content,
        url: undefined,
        vimeoVideoId: undefined,
      })
    }
  }, [content.url])

  if (type === "video") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Upload Video File</Label>
          <FileUpload
            type="video"
            accept="video/mp4,video/webm,video/ogg"
            maxSize={2 * 1024 * 1024 * 1024} // 2GB
            multiple={false}
            initialValue={content.url ? [content.url] : undefined}
            onUploadComplete={(files, urls) => {
              if (urls.length > 0) {
                onChange({
                  ...content,
                  url: urls[0],
                  vimeoVideoId: undefined, // Clear Vimeo ID when using S3
                })
              }
            }}
            onRemove={() => {
              onChange({
                ...content,
                url: "",
                vimeoVideoId: undefined,
              })
            }}
          />
        </div>

        {content.url && !content.url.includes("vimeo.com") && (
          <div className="space-y-2">
            <Label>Video Preview</Label>
            <div className="relative w-full aspect-video overflow-hidden border">
              <VideoPreviewPlayer
                src={content.url}
                showControlsOnHover={true}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (type === "text") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lessonContent">Lesson Content</Label>
          <RichTextEditor
            content={content.html || content.text || ""}
            onChange={(html) => onChange({ ...content, html, text: html })}
            placeholder="Enter lesson content..."
          />
        </div>
      </div>
    )
  }

  return null
}
