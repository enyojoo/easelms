"use client"

import { useState } from "react"
import { extractVimeoId, getVimeoEmbedUrl } from "@/lib/vimeo/utils"
import SafeImage from "@/components/SafeImage"
import ModernVideoPlayer from "@/components/ModernVideoPlayer"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

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
              <SafeImage
                src={thumbnailUrl || ""}
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

  // Use ModernVideoPlayer for non-Vimeo videos
  return (
    <div className="relative w-full aspect-video overflow-hidden shadow-lg">
      <ModernVideoPlayer
        src={videoUrl}
        poster={thumbnailUrl}
        controls={true}
        autoplay={false}
      />
    </div>
  )
}
