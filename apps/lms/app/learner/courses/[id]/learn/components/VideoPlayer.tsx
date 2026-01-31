"use client"

import { useState, useRef, useEffect } from "react"
import ModernVideoPlayer from "@/components/ModernVideoPlayer"

interface VideoPlayerProps {
  lessonTitle: string
  onComplete: () => void
  autoPlay?: boolean
  isActive: boolean
  videoUrl?: string // S3 video URL
  poster?: string // Optional thumbnail/poster image (e.g. lesson thumbnail)
  courseId?: string
  lessonId?: string
}

export default function VideoPlayer({
  lessonTitle,
  onComplete,
  autoPlay = true,
  isActive,
  videoUrl,
  poster,
  courseId,
  lessonId,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const completedRef = useRef(false)

  // Ensure videoUrl is a valid string URL
  const validVideoUrl = videoUrl && typeof videoUrl === 'string' && videoUrl.trim() ? videoUrl.trim() : null

  // Reset completion status when lesson changes
  useEffect(() => {
    completedRef.current = false
    setIsPlaying(false)
  }, [lessonId])

  if (!validVideoUrl) {
    return null
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <ModernVideoPlayer
        src={validVideoUrl}
        poster={poster}
        controls={true}
        autoplay={false}
        onPlay={() => {
          setIsPlaying(true)
        }}
        onPause={() => {
          setIsPlaying(false)
        }}
        onEnded={() => {
          setIsPlaying(false)
          if (!completedRef.current) {
            completedRef.current = true
            onComplete()
          }
        }}
        className="w-full h-full"
      />
    </div>
  )
}
