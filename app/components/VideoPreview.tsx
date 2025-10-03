"use client"

import { useState } from "react"
import { Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VideoPreviewProps {
  videoUrl: string
  thumbnailUrl: string
}

export default function VideoPreview({ videoUrl, thumbnailUrl }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    const video = document.getElementById("coursePreview") as HTMLVideoElement
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  return (
    <div className="relative">
      <video
        id="coursePreview"
        className="w-full rounded-lg shadow-lg"
        poster={thumbnailUrl}
        onEnded={() => setIsPlaying(false)}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
        <Button
          onClick={togglePlay}
          className="bg-primary/80 hover:bg-primary text-primary-foreground rounded-full p-2"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  )
}
