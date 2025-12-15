"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, CheckCircle2, AlertCircle } from "lucide-react"
import VideoPreview from "@/components/VideoPreview"
import { extractVimeoId, isVimeoUrl } from "@/lib/vimeo/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import FileUpload from "@/components/FileUpload"

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
}

export default function CourseBasicInfo({ data, onUpdate }: CourseBasicInfoProps) {
  const [thumbnail, setThumbnail] = useState(data.thumbnail || "/placeholder.svg?height=200&width=300")
  const [previewVideoInput, setPreviewVideoInput] = useState(data.previewVideo || "")
  const [vimeoId, setVimeoId] = useState<string | null>(null)
  const [isValidVideo, setIsValidVideo] = useState(true)

  useEffect(() => {
    if (previewVideoInput) {
      const extractedId = extractVimeoId(previewVideoInput)
      if (extractedId) {
        setVimeoId(extractedId)
        setIsValidVideo(true)
        onUpdate({ previewVideo: previewVideoInput, vimeoVideoId: extractedId })
      } else if (isVimeoUrl(previewVideoInput)) {
        setIsValidVideo(false)
        setVimeoId(null)
      } else {
        setVimeoId(null)
        setIsValidVideo(true)
        onUpdate({ previewVideo: previewVideoInput, vimeoVideoId: undefined })
      }
    } else {
      setVimeoId(null)
      setIsValidVideo(true)
      onUpdate({ previewVideo: "", vimeoVideoId: undefined })
    }
  }, [previewVideoInput])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    onUpdate({ [name]: value })
  }

  const handleThumbnailUpload = (files: File[], urls: string[]) => {
    if (urls.length > 0) {
      setThumbnail(urls[0])
      onUpdate({ thumbnail: urls[0] })
    }
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
        <Textarea
          id="requirements"
          name="requirements"
          value={data.requirements}
          onChange={handleInputChange}
          placeholder="Enter course requirements"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Course Description</Label>
        <Textarea
          id="description"
          name="description"
          value={data.description}
          onChange={handleInputChange}
          placeholder="Enter course description"
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whoIsThisFor">Who this course is for</Label>
        <Textarea
          id="whoIsThisFor"
          name="whoIsThisFor"
          value={data.whoIsThisFor}
          onChange={handleInputChange}
          placeholder="Describe the target audience for this course"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Course Thumbnail</Label>
        {thumbnail && thumbnail !== "/placeholder.svg?height=200&width=300" && (
          <div className="relative w-[300px] h-[200px] rounded-lg overflow-hidden border border-border mb-4">
            <Image src={thumbnail} alt="Course thumbnail" fill className="object-cover" />
          </div>
        )}
        <FileUpload
          type="thumbnail"
          bucket="course-thumbnails"
          accept="image/*"
          maxSize={5 * 1024 * 1024} // 5MB
          multiple={false}
          onUploadComplete={handleThumbnailUpload}
        />
        <p className="text-sm text-muted-foreground">Recommended resolution: 1280x720 px. Max size: 5MB</p>
      </div>

      <div className="space-y-2">
        <Label>Course Preview Video (Vimeo)</Label>
        <div className="space-y-4">
          <Input
            type="url"
            value={previewVideoInput}
            onChange={(e) => setPreviewVideoInput(e.target.value)}
            placeholder="Enter Vimeo URL (e.g., https://vimeo.com/123456789) or video ID"
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: https://vimeo.com/123456789, https://player.vimeo.com/video/123456789, or just the video ID
          </p>
          {previewVideoInput && (
            <Alert variant={isValidVideo ? "default" : "destructive"}>
              {isValidVideo && vimeoId ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Valid Vimeo video detected. Video ID: {vimeoId}
                  </AlertDescription>
                </>
              ) : !isValidVideo ? (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Invalid Vimeo URL format. Please enter a valid Vimeo URL or video ID.
                  </AlertDescription>
                </>
              ) : null}
            </Alert>
          )}
          {previewVideoInput && (
            <div className="relative w-full max-w-2xl">
              <VideoPreview videoUrl={previewVideoInput} thumbnailUrl={thumbnail} vimeoVideoId={vimeoId || undefined} />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Add a preview video to showcase your course. Recommended length: 2-5 minutes.
          </p>
        </div>
      </div>
    </div>
  )
}
