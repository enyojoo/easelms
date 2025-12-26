"use client"

import type React from "react"

import { useState, useEffect } from "react"
import SafeImage from "@/components/SafeImage"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, AlertCircle } from "lucide-react"
import VideoPreview from "@/components/VideoPreview"
import { extractVimeoId, isVimeoUrl } from "@/lib/vimeo/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import FileUpload from "@/components/FileUpload"
import RichTextEditor from "./RichTextEditor"

interface CourseBasicInfoProps {
  data: {
    title: string
    requirements: string
    description: string
    whoIsThisFor: string
    thumbnail: string
    previewVideo: string
    price: string
  }
  onUpdate: (data: any) => void
  availableCourses?: Array<{ id: number; title: string }>
}

export default function CourseBasicInfo({ data, onUpdate, availableCourses = [] }: CourseBasicInfoProps) {
  const [thumbnail, setThumbnail] = useState(data.thumbnail || "")
  const [previewVideoInput, setPreviewVideoInput] = useState(data.previewVideo || "")
  const [vimeoId, setVimeoId] = useState<string | null>(null)
  const [isValidVideo, setIsValidVideo] = useState(true)

  // Sync local state with data prop changes (for draft restoration and tab switching)
  useEffect(() => {
    // Always sync thumbnail from data prop
    if (data.thumbnail && data.thumbnail.trim() !== "") {
      setThumbnail(data.thumbnail)
    } else {
      setThumbnail("")
    }
  }, [data.thumbnail])

  // Sync preview video from data prop and extract vimeoId on mount/change
  useEffect(() => {
    const videoValue = data.previewVideo || ""
    // Only update if different to avoid unnecessary re-renders
    if (videoValue !== previewVideoInput) {
      setPreviewVideoInput(videoValue)
    }
    
    // Extract vimeoId if video exists (only when data changes, not on user input)
    if (videoValue) {
      const extractedId = extractVimeoId(videoValue)
      if (extractedId) {
        setVimeoId(extractedId)
        setIsValidVideo(true)
      } else if (isVimeoUrl(videoValue)) {
        setIsValidVideo(false)
        setVimeoId(null)
      } else {
        setVimeoId(null)
        setIsValidVideo(true)
      }
    } else {
      setVimeoId(null)
      setIsValidVideo(true)
    }
  }, [data.previewVideo, previewVideoInput]) // Include previewVideoInput to detect when it changes from data

  // Handle preview video input changes and update parent (only when user types, not from data sync)
  useEffect(() => {
    // Skip if this matches data.previewVideo (means it came from data prop sync, not user input)
    if (previewVideoInput === (data.previewVideo || "")) {
      return
    }
    
    if (previewVideoInput) {
      const extractedId = extractVimeoId(previewVideoInput)
      if (extractedId) {
        setVimeoId(extractedId)
        setIsValidVideo(true)
        onUpdate({ ...data, previewVideo: previewVideoInput, vimeoVideoId: extractedId })
      } else if (isVimeoUrl(previewVideoInput)) {
        setIsValidVideo(false)
        setVimeoId(null)
        // Still save invalid Vimeo URL so user can see the error
        onUpdate({ ...data, previewVideo: previewVideoInput, vimeoVideoId: undefined })
      } else {
        setVimeoId(null)
        setIsValidVideo(true)
        // Save the input even if not a valid Vimeo URL (user might be typing or using different format)
        onUpdate({ ...data, previewVideo: previewVideoInput, vimeoVideoId: undefined })
      }
    } else {
      setVimeoId(null)
      setIsValidVideo(true)
      onUpdate({ ...data, previewVideo: "", vimeoVideoId: undefined })
    }
  }, [previewVideoInput, data]) // Include data to access current state, but check prevents loops

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    onUpdate({ ...data, [name]: value })
  }

  const handleThumbnailUpload = (files: File[], urls: string[]) => {
    if (urls.length > 0) {
      setThumbnail(urls[0])
      onUpdate({ ...data, thumbnail: urls[0] })
    }
  }

  const handleThumbnailRemove = () => {
    setThumbnail("")
    onUpdate({ ...data, thumbnail: "" })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Course Title</Label>
        <Input
          id="title"
          name="title"
          value={data.title}
          onChange={handleInputChange}
          placeholder="Enter course title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">Requirements</Label>
        <RichTextEditor
          content={data.requirements || ""}
          onChange={(html) => onUpdate({ ...data, requirements: html })}
          placeholder="Enter course requirements"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Course Description</Label>
        <RichTextEditor
          content={data.description || ""}
          onChange={(html) => onUpdate({ ...data, description: html })}
          placeholder="Enter course description"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whoIsThisFor">Who this course is for</Label>
        <RichTextEditor
          content={data.whoIsThisFor || ""}
          onChange={(html) => onUpdate({ ...data, whoIsThisFor: html })}
          placeholder="Describe the target audience for this course"
        />
      </div>

      {/* Preview Image and Video in 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Course Thumbnail</Label>
          {thumbnail && thumbnail.trim() !== "" && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border mb-2">
              <SafeImage src={thumbnail} alt="Course thumbnail" fill className="object-cover" />
            </div>
          )}
          <FileUpload
            type="thumbnail"
            bucket="course-thumbnails"
            accept="image/*"
            maxSize={5 * 1024 * 1024} // 5MB
            multiple={false}
            initialValue={data.thumbnail && data.thumbnail.trim() !== "" ? data.thumbnail : undefined}
            onUploadComplete={handleThumbnailUpload}
            onRemove={handleThumbnailRemove}
          />
          <p className="text-sm text-muted-foreground">Recommended resolution: 1280x720 px. Max size: 5MB</p>
        </div>

        <div className="space-y-2">
          <Label>Course Preview Video (Vimeo)</Label>
          {previewVideoInput && vimeoId && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border mb-2">
              <VideoPreview videoUrl={previewVideoInput} thumbnailUrl={thumbnail} vimeoVideoId={vimeoId} />
            </div>
          )}
          <div className="space-y-2">
            <Input
              type="url"
              value={previewVideoInput}
              onChange={(e) => setPreviewVideoInput(e.target.value)}
              placeholder="Enter Vimeo URL (e.g., https://vimeo.com/123456789) or video ID"
            />
            {previewVideoInput && !isValidVideo && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Invalid Vimeo URL format. Please enter a valid Vimeo URL or video ID.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              Recommended length: 2-5 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
