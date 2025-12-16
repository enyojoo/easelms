"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus, CheckCircle2, AlertCircle, X, Plus, ChevronDown } from "lucide-react"
import VideoPreview from "@/components/VideoPreview"
import { extractVimeoId, isVimeoUrl } from "@/lib/vimeo/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import FileUpload from "@/components/FileUpload"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

interface CourseBasicInfoProps {
  data: {
    title: string
    requirements: string
    description: string
    whoIsThisFor: string
    thumbnail: string
    previewVideo: string
    price: string
    tags?: string[]
    learningObjectives?: string[]
    outcomes?: string[]
    prerequisites?: number[]
    estimatedDuration?: number
    difficulty?: string
    language?: string
    instructorId?: string
  }
  onUpdate: (data: any) => void
  availableCourses?: Array<{ id: number; title: string }>
}

export default function CourseBasicInfo({ data, onUpdate, availableCourses = [] }: CourseBasicInfoProps) {
  const [thumbnail, setThumbnail] = useState(data.thumbnail || "/placeholder.svg?height=200&width=300")
  const [previewVideoInput, setPreviewVideoInput] = useState(data.previewVideo || "")
  const [vimeoId, setVimeoId] = useState<string | null>(null)
  const [isValidVideo, setIsValidVideo] = useState(true)
  const [tagInput, setTagInput] = useState("")

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

  const addTag = () => {
    if (tagInput.trim() && !(data.tags || []).includes(tagInput.trim())) {
      onUpdate({ tags: [...(data.tags || []), tagInput.trim()] })
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    onUpdate({ tags: (data.tags || []).filter((t) => t !== tag) })
  }

  const addLearningObjective = () => {
    onUpdate({ learningObjectives: [...(data.learningObjectives || []), ""] })
  }

  const updateLearningObjective = (index: number, value: string) => {
    const objectives = [...(data.learningObjectives || [])]
    objectives[index] = value
    onUpdate({ learningObjectives: objectives })
  }

  const removeLearningObjective = (index: number) => {
    onUpdate({ learningObjectives: (data.learningObjectives || []).filter((_, i) => i !== index) })
  }

  const addOutcome = () => {
    onUpdate({ outcomes: [...(data.outcomes || []), ""] })
  }

  const updateOutcome = (index: number, value: string) => {
    const outcomes = [...(data.outcomes || [])]
    outcomes[index] = value
    onUpdate({ outcomes })
  }

  const removeOutcome = (index: number) => {
    onUpdate({ outcomes: (data.outcomes || []).filter((_, i) => i !== index) })
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

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>Additional Metadata</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Enter tag and press Enter"
              />
              <Button type="button" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(data.tags || []).map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Learning Objectives</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLearningObjective}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>
            {(data.learningObjectives || []).map((objective, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={objective}
                  onChange={(e) => updateLearningObjective(index, e.target.value)}
                  placeholder={`Objective ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLearningObjective(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Course Outcomes</Label>
              <Button type="button" variant="outline" size="sm" onClick={addOutcome}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </div>
            {(data.outcomes || []).map((outcome, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={outcome}
                  onChange={(e) => updateOutcome(index, e.target.value)}
                  placeholder={`Outcome ${index + 1}`}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeOutcome(index)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estimated Duration (hours)</Label>
              <Input
                type="number"
                min="0"
                value={data.estimatedDuration || ""}
                onChange={(e) => onUpdate({ estimatedDuration: Number.parseFloat(e.target.value) || undefined })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Difficulty Level</Label>
              <Select
                value={data.difficulty || ""}
                onValueChange={(value) => onUpdate({ difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Input
                value={data.language || ""}
                onChange={(e) => onUpdate({ language: e.target.value })}
                placeholder="e.g., English"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
