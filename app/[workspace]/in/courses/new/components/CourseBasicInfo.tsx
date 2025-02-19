"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus } from "lucide-react"
import VideoPreview from "@/app/components/VideoPreview"

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    onUpdate({ [name]: value })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real app, you would upload this to your storage
      const imageUrl = URL.createObjectURL(file)
      setThumbnail(imageUrl)
      onUpdate({ thumbnail: imageUrl })
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
        <div className="flex items-start space-x-4">
          <div className="relative w-[300px] h-[200px] rounded-lg overflow-hidden border border-border">
            <Image src={thumbnail || "/placeholder.svg"} alt="Course thumbnail" fill className="object-cover" />
          </div>
          <div>
            <Label htmlFor="thumbnail" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                <ImagePlus className="w-4 h-4" />
                Upload
              </div>
              <input id="thumbnail" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </Label>
            <p className="text-sm text-muted-foreground mt-2">Resolution: 1280x720 px</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Course Preview Video</Label>
        <div className="space-y-4">
          <Input
            name="previewVideo"
            type="url"
            value={data.previewVideo}
            onChange={handleInputChange}
            placeholder="Enter video URL"
          />
          {data.previewVideo && (
            <div className="relative w-full max-w-2xl">
              <VideoPreview videoUrl={data.previewVideo} thumbnailUrl={thumbnail} />
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

