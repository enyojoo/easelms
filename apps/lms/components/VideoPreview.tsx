"use client"

import ModernVideoPlayer from "@/components/ModernVideoPlayer"

interface VideoPreviewProps {
  videoUrl: string
  thumbnailUrl: string
}

export default function VideoPreview({ videoUrl, thumbnailUrl }: VideoPreviewProps) {
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
