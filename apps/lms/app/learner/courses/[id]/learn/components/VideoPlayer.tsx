"use client"

import { useState, useRef, useEffect } from "react"
import ModernVideoPlayer from "@/components/ModernVideoPlayer"

interface VideoPlayerProps {
  lessonTitle: string
  onComplete: () => void
  autoPlay?: boolean
  isActive: boolean
  videoUrl?: string // S3 video URL
  courseId?: string
  lessonId?: string
  videoProgression?: boolean // Enable video progress tracking
  onProgressUpdate?: (progress: number) => void // Callback for progress updates
}

export default function VideoPlayer({
  lessonTitle,
  onComplete,
  autoPlay = true,
  isActive,
  videoUrl,
  courseId,
  lessonId,
  videoProgression = false,
  onProgressUpdate,
}: VideoPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const completedRef = useRef(false)

  // Storage key for video progress
  const progressStorageKey = courseId && lessonId ? `course-${courseId}-lesson-${lessonId}-progress` : null

  // Reset completion status when lesson changes
  useEffect(() => {
    completedRef.current = false
  }, [lessonId])

  // Load saved progress
  useEffect(() => {
    if (!videoProgression || !progressStorageKey) return

    try {
      const savedProgress = localStorage.getItem(progressStorageKey)
      if (savedProgress) {
        const { currentTime: savedTime, duration: savedDuration } = JSON.parse(savedProgress)
        if (savedTime > 0 && savedDuration > 0) {
          setCurrentTime(savedTime)
        }
      }
    } catch (error) {
      console.error("Error loading video progress:", error)
    }
  }, [videoProgression, progressStorageKey, lessonId])

  // Save progress periodically
  useEffect(() => {
    if (!videoProgression || !progressStorageKey || duration === 0) return

    // Clear existing interval
    if (progressSaveIntervalRef.current) {
      clearInterval(progressSaveIntervalRef.current)
    }

    // Save progress every 5 seconds
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

          // Call progress update callback
          if (onProgressUpdate) {
            onProgressUpdate(progressData.progressPercentage)
          }

        } catch (error) {
          console.error("Error saving video progress:", error)
        }
      }
    }, 5000)

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current)
      }
    }
  }, [videoProgression, progressStorageKey, currentTime, duration, onProgressUpdate, onComplete])


  // Ensure videoUrl is a valid string URL (S3 URLs are absolute URLs)
  const validVideoUrl = videoUrl && typeof videoUrl === 'string' && videoUrl.trim() ? videoUrl.trim() : null

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {validVideoUrl ? (
        <ModernVideoPlayer
          src={validVideoUrl}
          controls={true}
          autoplay={autoPlay && isActive}
          key={`lesson-${lessonId}`}
          onReady={(player) => {
            // Set up progress tracking with video player
            if (videoProgression && progressStorageKey) {
              const handleTimeUpdate = () => {
                const current = typeof player.currentTime === 'function' ? player.currentTime() : player.currentTime
                const dur = typeof player.duration === 'function' ? player.duration() : player.duration
                if (current > 0 && dur > 0) {
                  setCurrentTime(current)
                  setDuration(dur)
                  
                  // Save progress
                  try {
                    localStorage.setItem(
                      progressStorageKey,
                      JSON.stringify({ currentTime: current, duration: dur })
                    )
                  } catch (error) {
                    console.error("Error saving video progress:", error)
                  }
                  
                  // Call progress update callback
                  if (onProgressUpdate && dur > 0) {
                    onProgressUpdate((current / dur) * 100)
                  }
                }
              }
              
              // Use the proxy's on method or addEventListener directly
              if (typeof player.on === 'function') {
                player.on("timeupdate", handleTimeUpdate)
              } else if (player.el && player.el()) {
                player.el().addEventListener("timeupdate", handleTimeUpdate)
              }
              
              // Load saved progress
              try {
                const savedProgress = localStorage.getItem(progressStorageKey)
                if (savedProgress) {
                  const { currentTime: savedTime, duration: savedDuration } = JSON.parse(savedProgress)
                  if (savedTime > 5 && savedTime < savedDuration) {
                    if (typeof player.currentTime === 'function') {
                      player.currentTime(savedTime)
                    } else {
                      player.currentTime = savedTime
                    }
                    setCurrentTime(savedTime)
                  }
                }
              } catch (error) {
                console.error("Error loading video progress:", error)
              }
            }
          }}
          onEnded={() => {
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
      ) : null}
    </div>
  )
}
