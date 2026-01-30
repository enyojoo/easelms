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
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const completedRef = useRef(false)
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Storage key for video progress
  const progressStorageKey = courseId && lessonId ? `course-${courseId}-lesson-${lessonId}-progress` : null

  // Ensure videoUrl is a valid string URL
  const validVideoUrl = videoUrl && typeof videoUrl === 'string' && videoUrl.trim() ? videoUrl.trim() : null

  // Reset completion status when lesson changes
  useEffect(() => {
    completedRef.current = false
    setIsPlaying(false)
    setCurrentTime(0)
  }, [lessonId])

  // Save progress to localStorage periodically (always enabled for resume functionality)
  useEffect(() => {
    if (!progressStorageKey || duration === 0) return

    // Clear existing interval
    if (progressSaveIntervalRef.current) {
      clearInterval(progressSaveIntervalRef.current)
    }

    // Save progress every 5 seconds to localStorage for resume functionality
    progressSaveIntervalRef.current = setInterval(() => {
      if (currentTime > 0 && duration > 0) {
        try {
          const progressData = {
            currentTime,
            duration,
            progressPercentage: (currentTime / duration) * 100,
            lastUpdated: new Date().toISOString(),
          }
          localStorage.setItem(progressStorageKey, JSON.stringify(progressData))
        } catch (error) {
          console.error("Error saving video progress to localStorage:", error)
        }
      }
    }, 5000)

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current)
      }
    }
  }, [progressStorageKey, currentTime, duration])

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
        onReady={(player: any) => {
          // Always enable resume functionality - load saved progress from localStorage
          if (progressStorageKey) {
            try {
              const savedProgress = localStorage.getItem(progressStorageKey)
              if (savedProgress) {
                const { currentTime: savedTime, duration: savedDuration } = JSON.parse(savedProgress)
                if (savedTime > 5 && savedTime < savedDuration) {
                  // Resume from saved position if more than 5 seconds watched
                  if (typeof player.currentTime === 'function') {
                    player.currentTime(savedTime)
                  } else {
                    player.currentTime = savedTime
                  }
                  setCurrentTime(savedTime)
                }
              }
            } catch (error) {
              console.error("Error loading video progress from localStorage:", error)
            }
          }
        }}
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
        onTimeUpdate={(current, dur) => {
          setCurrentTime(current)
          setDuration(dur)
        }}
        className="w-full h-full"
      />
    </div>
  )
}
