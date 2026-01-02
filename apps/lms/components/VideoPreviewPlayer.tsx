"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause } from "lucide-react"
import SafeImage from "@/components/SafeImage"
import { Progress } from "@/components/ui/progress"

interface VideoPreviewPlayerProps {
  src: string
  poster?: string
  className?: string
  onClick?: () => void
  autoplay?: boolean
  showControlsOnHover?: boolean
}

export default function VideoPreviewPlayer({
  src,
  poster,
  className = "",
  onClick,
  autoplay = false,
  showControlsOnHover = false,
}: VideoPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay)
  const [isHovered, setIsHovered] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Sync video state with isPlaying and handle autoplay
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      setIsPlaying(true)
    }
    const handlePause = () => {
      setIsPlaying(false)
    }
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const handleTimeUpdate = () => {
      if (video) {
        setCurrentTime(video.currentTime)
        if (video.duration && !isNaN(video.duration)) {
          setDuration(video.duration)
        }
      }
    }
    const handleCanPlay = async () => {
      // If autoplay is enabled, try to play once video can play
      if (autoplay && video.paused) {
        try {
          await video.play()
        } catch (error) {
          // Silently handle autoplay errors (browser policies)
          if (error.name !== 'NotAllowedError') {
            console.error("Error autoplaying video:", error)
          }
        }
      }
    }
    const handleLoadedData = async () => {
      // Try to play when data is loaded
      if (autoplay && video.paused) {
        try {
          await video.play()
        } catch (error) {
          // Silently handle autoplay errors (browser policies)
          if (error.name !== 'NotAllowedError') {
            console.error("Error autoplaying video on load:", error)
          }
        }
      }
    }
    const handleLoadedMetadata = () => {
      if (video && video.duration && !isNaN(video.duration)) {
        setDuration(video.duration)
      }
      // Try to play as soon as metadata is loaded
      if (autoplay && video.paused) {
        video.play().catch((error) => {
          // Silently handle autoplay errors (browser policies)
          if (error.name !== 'NotAllowedError') {
            console.error("Error autoplaying video on metadata:", error)
          }
        })
      }
    }

    video.addEventListener("play", handlePlay)
    video.addEventListener("playing", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("loadeddata", handleLoadedData)

    // Autoplay when prop changes to true - try immediately
    if (autoplay) {
      // Try immediately regardless of readyState
      const attemptPlay = () => {
        if (video.paused) {
          video.play().catch((error) => {
            // Silently handle autoplay errors (browser policies)
            if (error.name !== 'NotAllowedError') {
              console.error("Error autoplaying video:", error)
            }
          })
        }
      }
      
      // Try immediately
      attemptPlay()
      
      // Also try when video becomes ready (multiple fallbacks)
      if (video.readyState >= 1) {
        attemptPlay()
      }
    }

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("playing", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("loadeddata", handleLoadedData)
    }
  }, [autoplay])

  // Additional effect to handle autoplay prop changes immediately
  useEffect(() => {
    const video = videoRef.current
    if (!video || !autoplay) return

    // Try to play immediately when autoplay becomes true
    const attemptPlay = () => {
      if (video.paused && autoplay) {
        video.play().catch((error) => {
          // Silently handle autoplay errors (browser policies)
          if (error.name !== 'NotAllowedError') {
            console.error("Error autoplaying video (immediate):", error)
          }
        })
      }
    }

    // Try immediately
    attemptPlay()

    // Also try after a microtask to ensure DOM is ready
    Promise.resolve().then(() => {
      attemptPlay()
    })
  }, [autoplay])

  if (!src || !src.trim() || src.includes("your_cloudfront_domain") || src.includes("your-cloudfront-domain")) {
    return (
      <div className={`relative w-full aspect-video bg-muted flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground text-sm">No video source provided</p>
      </div>
    )
  }

  const handleTogglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const video = videoRef.current
    if (video) {
      if (isPlaying) {
        video.pause()
        setIsPlaying(false)
      } else {
        try {
          await video.play()
          setIsPlaying(true)
          onClick?.()
        } catch (error) {
          console.error("Error playing video:", error)
        }
      }
    } else {
      setIsPlaying(!isPlaying)
      onClick?.()
    }
  }

  // Show play button when not playing
  // Show pause button when playing and hovering (if showControlsOnHover is true)
  const showPlayButton = !isPlaying
  const showPauseButton = isPlaying && isHovered && showControlsOnHover
  const showOverlay = showPlayButton || showPauseButton
  
  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div 
      className={`relative w-full aspect-video overflow-hidden cursor-pointer group ${className}`}
      onMouseEnter={() => {
        setIsHovered(true)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
      }}
      onClick={handleTogglePlay}
    >
      <video
        key={src.trim()}
        ref={videoRef}
        src={src.trim()}
        className="w-full h-full object-cover"
        preload="auto"
        muted={false}
        playsInline
        crossOrigin="anonymous"
        loop={false}
        poster={poster}
        autoPlay={autoplay}
      />
      {showOverlay && (
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          {showPauseButton ? (
            <div className="bg-primary/90 hover:bg-primary text-primary-foreground rounded-full p-3 group-hover:scale-110 transition-transform shadow-lg">
              <Pause className="h-10 w-10 fill-current" />
            </div>
          ) : (
            <div className="bg-primary/90 hover:bg-primary text-primary-foreground rounded-full p-3 group-hover:scale-110 transition-transform shadow-lg">
              <Play className="h-10 w-10 fill-current" />
            </div>
          )}
        </div>
      )}
      
      {/* Progress bar at the bottom */}
      {duration > 0 && (
        <div 
          className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 sm:p-3 pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5">
            <span className="text-white text-xs sm:text-sm font-mono tabular-nums min-w-[3ch]">
              {formatTime(currentTime)}
            </span>
            <Progress 
              value={progress} 
              className="flex-1 h-1 sm:h-1.5"
            />
            <span className="text-white text-xs sm:text-sm font-mono tabular-nums min-w-[3ch]">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
