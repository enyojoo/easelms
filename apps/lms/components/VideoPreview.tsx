"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { extractVimeoId, getVimeoEmbedUrl } from "@/lib/vimeo/utils"
import Image from "next/image"

interface VideoPreviewProps {
  videoUrl: string
  thumbnailUrl: string
  vimeoVideoId?: string
}

export default function VideoPreview({ videoUrl, thumbnailUrl, vimeoVideoId }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const vimeoId = vimeoVideoId || (videoUrl ? extractVimeoId(videoUrl) : null)
  const isVimeoVideo = !!vimeoId

  const togglePlay = () => {
    setIsPlaying(true)
  }

  if (isVimeoVideo && vimeoId) {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
        {isPlaying ? (
          <iframe
            src={getVimeoEmbedUrl(vimeoId, { autoplay: true, controls: true, responsive: true })}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Video preview"
          />
        ) : (
          <>
            <div className="relative w-full h-full">
              <Image
                src={thumbnailUrl}
                alt="Video thumbnail"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Button
                onClick={togglePlay}
                className="bg-primary/80 hover:bg-primary text-primary-foreground rounded-full p-4"
                size="lg"
              >
                <Play className="h-8 w-8" />
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Fallback to HTML5 video for non-Vimeo videos
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
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <Button
            onClick={togglePlay}
            className="bg-primary/80 hover:bg-primary text-primary-foreground rounded-full p-2"
          >
            <Play className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  )
}
