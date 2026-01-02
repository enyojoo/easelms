"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import SafeImage from "@/components/SafeImage"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, AlertCircle } from "lucide-react"
import VideoPreview from "@/components/VideoPreview"
import { extractVimeoId, isVimeoUrl, getVimeoEmbedUrl } from "@/lib/vimeo/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import FileUpload from "@/components/FileUpload"
import VideoPreviewPlayer from "@/components/VideoPreviewPlayer"

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
  // Initialize state from data prop (for draft restoration)
  const [thumbnail, setThumbnail] = useState(() => data.thumbnail || "")
  const [previewVideoInput, setPreviewVideoInput] = useState(() => data.previewVideo || "")
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>("") // Track uploaded video URL immediately
  const [vimeoId, setVimeoId] = useState<string | null>(() => {
    // Extract vimeoId immediately on mount if video exists
    if (data.previewVideo) {
      return extractVimeoId(data.previewVideo)
    }
    return null
  })
  const [isValidVideo, setIsValidVideo] = useState(true)
  
  // Use ref to track if update is from user input or data prop sync
  const isUserInputRef = useRef(false)
  const isInitialMountRef = useRef(true)

  // Sync local state with data prop changes (for draft restoration and tab switching)
  useEffect(() => {
    // Always sync thumbnail from data prop
    const newThumbnail = data.thumbnail && data.thumbnail.trim() !== "" ? data.thumbnail : ""
    if (newThumbnail !== thumbnail) {
      setThumbnail(newThumbnail)
    }
  }, [data.thumbnail, thumbnail])

  // Sync preview video from data prop and extract vimeoId (only when data changes, not user input)
  useEffect(() => {
    // Skip if this is from user input
    if (isUserInputRef.current) {
      isUserInputRef.current = false
      return
    }
    
    const videoValue = data.previewVideo || ""
    if (videoValue !== previewVideoInput) {
      setPreviewVideoInput(videoValue)
    }
    
    // Sync uploaded video URL if data.previewVideo is set and not a Vimeo URL
    if (videoValue && !videoValue.includes("vimeo.com")) {
      setUploadedVideoUrl(videoValue)
    } else if (!videoValue) {
      setUploadedVideoUrl("")
    }
    
    // Extract vimeoId if video exists
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
  }, [data.previewVideo]) // Only depend on data.previewVideo

  // Handle preview video input changes and update parent (only when user types)
  useEffect(() => {
    // Skip on initial mount to prevent unnecessary updates
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }
    
    // Skip if this matches data.previewVideo (means it came from data prop sync)
    if (previewVideoInput === (data.previewVideo || "")) {
      return
    }
    
    // Mark as user input to prevent data sync useEffect from running
    isUserInputRef.current = true
    
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
  }, [previewVideoInput]) // Only trigger on user input changes

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
        <Label htmlFor="description">Course Description</Label>
        <Textarea
          id="description"
          name="description"
          value={data.description || ""}
          onChange={handleInputChange}
          placeholder="Enter course description"
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea
          id="requirements"
          name="requirements"
          value={data.requirements || ""}
          onChange={handleInputChange}
          placeholder="Enter course requirements"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whoIsThisFor">Who this course is for</Label>
        <Textarea
          id="whoIsThisFor"
          name="whoIsThisFor"
          value={data.whoIsThisFor || ""}
          onChange={handleInputChange}
          placeholder="Describe the target audience for this course"
          rows={4}
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
          <p className="text-xs text-muted-foreground">Recommended resolution: 1280x720 px. Max size: 5MB</p>
        </div>

        <div className="space-y-2">
          <Label>Course Preview Video</Label>
          {(() => {
            const videoUrl = uploadedVideoUrl || data.previewVideo || previewVideoInput
            const hasVideo = videoUrl && videoUrl.trim() && !videoUrl.includes("vimeo.com")
            
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log('Course Preview Video Debug:', {
                uploadedVideoUrl,
                previewVideo: data.previewVideo,
                previewVideoInput,
                videoUrl,
                hasVideo
              })
            }
            
            if (hasVideo) {
              return (
                <div className="relative w-full aspect-video overflow-hidden border border-border mb-2">
                  <VideoPreviewPlayer
                    key={videoUrl}
                    src={videoUrl}
                    showControlsOnHover={true}
                  />
                </div>
              )
            }
            return null
          })()}
          {/* Show Vimeo preview if it's a Vimeo URL (backward compatibility) */}
          {vimeoId && data.previewVideo?.includes("vimeo.com") && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border mb-2">
              <iframe
                src={getVimeoEmbedUrl(vimeoId, { autoplay: false, controls: true })}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Course preview video"
              />
            </div>
          )}
          <FileUpload
            type="video"
            accept="video/mp4,video/webm,video/ogg"
            maxSize={2 * 1024 * 1024 * 1024} // 2GB
            multiple={false}
            initialValue={data.previewVideo && !data.previewVideo.includes("vimeo.com") ? data.previewVideo : undefined}
            onUploadComplete={(files, urls) => {
              if (urls && urls.length > 0 && urls[0]) {
                const videoUrl = urls[0].trim()
                if (videoUrl) {
                  // Set uploaded URL immediately for preview (before parent update)
                  setUploadedVideoUrl(videoUrl)
                  // Also update local state to ensure immediate re-render
                  setPreviewVideoInput(videoUrl)
                  // Update parent state
                  const newData = { ...data, previewVideo: videoUrl, vimeoVideoId: undefined }
                  onUpdate(newData)
                }
              }
            }}
            onRemove={() => {
              setUploadedVideoUrl("")
              const newData = { ...data, previewVideo: "", vimeoVideoId: undefined }
              onUpdate(newData)
              setPreviewVideoInput("")
            }}
          />
          <p className="text-xs text-muted-foreground">
            Recommended length: 2-5 minutes, MP4 format.
          </p>
        </div>
      </div>
    </div>
  )
}
