"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { extractVimeoId, isVimeoUrl, getVimeoEmbedUrl } from "@/lib/vimeo/utils"
import { useState, useEffect } from "react"
import RichTextEditor from "./RichTextEditor"

interface LessonContentEditorProps {
  type: "video" | "text"
  content: any
  onChange: (content: any) => void
}

export default function LessonContentEditor({ type, content, onChange }: LessonContentEditorProps) {
  const [videoInput, setVideoInput] = useState(content.url || content.vimeoVideoId || "")
  const [vimeoId, setVimeoId] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    if (videoInput) {
      const extractedId = extractVimeoId(videoInput)
      if (extractedId) {
        setVimeoId(extractedId)
        setIsValid(true)
        onChange({
          ...content,
          url: videoInput,
          vimeoVideoId: extractedId,
        })
      } else if (isVimeoUrl(videoInput)) {
        setIsValid(false)
        setVimeoId(null)
      } else {
        // Not a Vimeo URL, store as regular URL
        setVimeoId(null)
        setIsValid(true)
        onChange({
          ...content,
          url: videoInput,
          vimeoVideoId: undefined,
        })
      }
    } else {
      setVimeoId(null)
      setIsValid(true)
      onChange({
        ...content,
        url: "",
        vimeoVideoId: undefined,
      })
    }
  }, [videoInput])

  if (type === "video") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="videoUrl">Vimeo Video URL or ID</Label>
          <Input
            id="videoUrl"
            placeholder="Enter Vimeo URL (e.g., https://vimeo.com/123456789) or video ID"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: https://vimeo.com/123456789, https://player.vimeo.com/video/123456789, or just the video ID
          </p>
          {videoInput && (
            <Alert variant={isValid ? "default" : "destructive"}>
              {isValid && vimeoId ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Valid Vimeo video detected. Video ID: {vimeoId}
                  </AlertDescription>
                </>
              ) : !isValid ? (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Invalid Vimeo URL format. Please enter a valid Vimeo URL or video ID.
                  </AlertDescription>
                </>
              ) : null}
            </Alert>
          )}
        </div>

        {vimeoId && (
          <div className="space-y-2">
            <Label>Video Preview</Label>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
              <iframe
                src={getVimeoEmbedUrl(vimeoId, { autoplay: false, controls: true })}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Video preview"
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
