"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, Loader2 } from "lucide-react"
import SafeImage from "@/components/SafeImage"
import { Progress } from "@/components/ui/progress"
import { useHLS } from "@/lib/hooks/useHLS"

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
  const [showControls, setShowControls] = useState(true) // Controls visibility state
  const [isLoading, setIsLoading] = useState(false) // Track loading state - start false, only show when buffering
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Signal that the video element is in the DOM (needed when used inside Dialog/modal)
  const [videoReady, setVideoReady] = useState(false)
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el
    setVideoReady(!!el)
  }, [])

  // Initialize HLS hook for adaptive streaming (videoReady ensures HLS runs after video is mounted, e.g. in modal)
  const { isHLS: isHLSFile, isLoading: isHLSLoading, error: hlsError } = useHLS({
    videoRef,
    src,
    videoReady,
    autoplay,
    onError: (error) => {
      console.error('HLS playback error:', error)
      setIsLoading(false)
    },
  })

  // Update loading state based on HLS loading
  useEffect(() => {
    if (isHLSFile && isHLSLoading) {
      setIsLoading(true)
    }
  }, [isHLSFile, isHLSLoading])

  // Track video loading state - only show spinner when actually buffering
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadStart = () => {
      // Only show loading if video is not already ready (cached videos won't need loading)
      // Check if video has enough data to play
      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        setIsLoading(true)
      }
    }

    const handleWaiting = () => {
      // Video is waiting for data (buffering) - this is the key event for showing spinner
      setIsLoading(true)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      // Show video thumbnail (first frame) when paused so user sees thumbnail instead of black
      if (video.paused) video.currentTime = 0
    }

    const handleCanPlayThrough = () => {
      setIsLoading(false)
      if (video.paused) video.currentTime = 0
    }

    const handlePlaying = () => {
      // Video is actually playing (not buffering) - hide spinner
      setIsLoading(false)
    }

    const handleError = () => {
      // Stop loading on error
      setIsLoading(false)
    }

    // Check initial state - if video is already ready (cached), don't show loading
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      setIsLoading(false)
    }

    video.addEventListener("loadstart", handleLoadStart)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("canplaythrough", handleCanPlayThrough)
    video.addEventListener("playing", handlePlaying)
    video.addEventListener("error", handleError)

    return () => {
      video.removeEventListener("loadstart", handleLoadStart)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("canplaythrough", handleCanPlayThrough)
      video.removeEventListener("playing", handlePlaying)
      video.removeEventListener("error", handleError)
    }
  }, [src])

  // Sync video state with isPlaying and handle autoplay
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      setIsPlaying(true)
      // Check if mobile/tablet
      const isMobileOrTablet = typeof window !== 'undefined' && 
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 1024)
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      
      // When showControlsOnHover is true and on mobile/tablet, hide controls immediately
      // (pause button won't show anyway since there's no hover on mobile)
      // On desktop or when showControlsOnHover is false, show controls then hide after 5 seconds
      if (showControlsOnHover && isMobileOrTablet) {
        // On mobile/tablet with showControlsOnHover, hide controls immediately
        setShowControls(false)
      } else {
        // On desktop or when showControlsOnHover is false, show controls then hide after 5 seconds
        setShowControls(true)
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false)
        }, 5000)
      }
    }
    const handlePause = () => {
      setIsPlaying(false)
      // Show controls when paused
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      // Seek to start so thumbnail/first frame is shown again (like poster)
      if (video) video.currentTime = 0
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
        } catch (error: unknown) {
          // Silently handle autoplay errors (browser policies)
          if (!(error instanceof Error) || (error.name !== 'NotAllowedError' && error.name !== 'AbortError')) {
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
        } catch (error: unknown) {
          // Silently handle autoplay errors (browser policies)
          if (!(error instanceof Error) || (error.name !== 'NotAllowedError' && error.name !== 'AbortError')) {
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
          if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
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
            if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
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
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
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
          if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
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

  // Show play button when not playing and controls are visible
  // Show pause button when playing and controls are visible
  // When showControlsOnHover is true: pause button only shows on hover (desktop) or tap (mobile)
  // When showControlsOnHover is false: pause button shows normally
  // Don't show play/pause overlay when video is loading
  const showPlayButton = !isPlaying && showControls && !isLoading
  const showPauseButton = isPlaying && showControls && (!showControlsOnHover || isHovered) && !isLoading
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
        // Show controls on hover when playing (desktop only)
        if (isPlaying) {
          setShowControls(true)
          if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
          }
          // Hide again after 5 seconds if still playing
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false)
          }, 5000)
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        // On desktop with showControlsOnHover, hide controls immediately when mouse leaves
        if (isPlaying && showControlsOnHover) {
          setShowControls(false)
          if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
          }
        }
      }}
      onTouchStart={() => {
        // On mobile/tablet, show controls briefly on touch
        if (isPlaying) {
          setShowControls(true)
          setIsHovered(true)
          if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
          }
          // Hide again after 5 seconds
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false)
            setIsHovered(false)
          }, 5000)
        }
      }}
      onClick={handleTogglePlay}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}
      <video
        key={src.trim()}
        ref={setVideoRef}
        src={isHLSFile ? undefined : src.trim()}
        className="w-full h-full object-cover"
        preload="auto"
        muted={false}
        playsInline
        crossOrigin={src?.includes('s3.amazonaws.com') || src?.includes('amazonaws.com') || src?.includes('azurefd.net') ? undefined : "anonymous"}
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
