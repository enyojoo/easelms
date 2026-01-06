"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const [isPlaying, setIsPlaying] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wasPlayingBeforeFullscreenRef = useRef(false)
  const completedRef = useRef(false)
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Storage key for video progress
  const progressStorageKey = courseId && lessonId ? `course-${courseId}-lesson-${lessonId}-progress` : null

  // Reset completion status when lesson changes
  useEffect(() => {
    completedRef.current = false
  }, [lessonId])

  // Load saved progress
  useEffect(() => {
    if (!videoProgression || !progressStorageKey) return

    const video = videoRef.current
    if (!video) return

    try {
      const savedProgress = localStorage.getItem(progressStorageKey)
      if (savedProgress) {
        const { currentTime: savedTime, duration: savedDuration } = JSON.parse(savedProgress)
        if (savedTime > 0 && savedDuration > 0) {
          // Wait for video to be ready
          const loadProgress = () => {
            if (video.readyState >= 2) {
              if (savedTime > 5 && savedTime < savedDuration) {
                video.currentTime = savedTime
                setCurrentTime(savedTime)
              }
            } else {
              video.addEventListener('loadeddata', loadProgress, { once: true })
            }
          }
          loadProgress()
        }
      }
    } catch (error) {
      console.error("Error loading video progress", error)
    }
  }, [videoProgression, progressStorageKey, lessonId])

  // Save progress periodically
  useEffect(() => {
    if (!videoProgression || !progressStorageKey || duration === 0) return

    if (progressSaveIntervalRef.current) {
      clearInterval(progressSaveIntervalRef.current)
    }

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
          if (onProgressUpdate && duration > 0) {
            onProgressUpdate(progressData.progressPercentage)
          }
        } catch (error) {
          console.error("Error saving video progress", error)
        }
      }
    }, 5000)

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current)
      }
    }
  }, [videoProgression, progressStorageKey, currentTime, duration, onProgressUpdate])

  // Sync video state with isPlaying and handle autoplay
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      setIsPlaying(true)
      // Show controls then hide after 5 seconds
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 5000)
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
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    }

    const handleTimeUpdate = () => {
      if (video && !isSeeking) {
        const current = video.currentTime
        const dur = video.duration && !isNaN(video.duration) ? video.duration : 0
        setCurrentTime(current)
        if (dur > 0) {
          setDuration(dur)
          // Call progress update callback
          if (onProgressUpdate && dur > 0) {
            onProgressUpdate((current / dur) * 100)
          }
        }
      }
    }

    const handleCanPlay = async () => {
      if (autoPlay && isActive && video.paused) {
        try {
          await video.play()
        } catch (error) {
          if (error.name !== 'NotAllowedError') {
            console.error("Error autoplaying video:", error)
          }
        }
      }
    }

    const handleLoadedData = async () => {
      if (autoPlay && isActive && video.paused) {
        try {
          await video.play()
        } catch (error) {
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
      if (autoPlay && isActive && video.paused) {
        video.play().catch((error) => {
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

    // Try autoplay immediately if conditions are met
    if (autoPlay && isActive) {
      const attemptPlay = () => {
        if (video.paused) {
          video.play().catch((error) => {
            if (error.name !== 'NotAllowedError') {
              console.error("Error autoplaying video:", error)
            }
          })
        }
      }
      attemptPlay()
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
  }, [autoPlay, isActive, onComplete, onProgressUpdate, isSeeking])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isFullscreenNow)
      
      const video = videoRef.current
      if (video) {
        if (isFullscreenNow) {
          video.style.objectFit = 'contain'
        } else {
          video.style.objectFit = 'cover'
          // Resume playback if video was playing before fullscreen (mobile fix)
          if (wasPlayingBeforeFullscreenRef.current && video.paused) {
            setTimeout(() => {
              if (video && video.paused) {
                video.play().catch((error) => {
                  console.debug("Could not resume playback after fullscreen:", error)
                })
              }
            }, 100)
          }
          wasPlayingBeforeFullscreenRef.current = false
        }
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("mozfullscreenchange", handleFullscreenChange)
    document.addEventListener("MSFullscreenChange", handleFullscreenChange)
    window.addEventListener("orientationchange", handleFullscreenChange)
    window.addEventListener("resize", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange)
      window.removeEventListener("orientationchange", handleFullscreenChange)
      window.removeEventListener("resize", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return

    try {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )

      if (!isCurrentlyFullscreen) {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        const isAndroid = /Android/i.test(navigator.userAgent)
        
        wasPlayingBeforeFullscreenRef.current = !video.paused
        
        try {
          if (isIOS && (video as any).webkitEnterFullscreen) {
            video.removeAttribute('playsinline')
            video.removeAttribute('webkit-playsinline')
            ;(video as any).playsInline = false
            ;(video as any).webkitPlaysInline = false
            await (video as any).webkitEnterFullscreen()
          } else if (isAndroid && (video as any).webkitEnterFullscreen) {
            await (video as any).webkitEnterFullscreen()
          } else {
            const elementToFullscreen = container
            if (elementToFullscreen.requestFullscreen) {
              await elementToFullscreen.requestFullscreen()
            } else if ((elementToFullscreen as any).webkitRequestFullscreen) {
              await (elementToFullscreen as any).webkitRequestFullscreen()
            } else if ((elementToFullscreen as any).mozRequestFullScreen) {
              await (elementToFullscreen as any).mozRequestFullScreen()
            } else if ((elementToFullscreen as any).msRequestFullscreen) {
              await (elementToFullscreen as any).msRequestFullscreen()
            }
          }
        } catch (err) {
          console.error("Error entering fullscreen:", err)
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
        
        if (video) {
          video.setAttribute('playsinline', 'true')
          video.setAttribute('webkit-playsinline', 'true')
          ;(video as any).playsInline = true
          ;(video as any).webkitPlaysInline = true
        }
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error)
    }
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
        } catch (error) {
          console.error("Error playing video:", error)
        }
      }
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video || !duration) return

    const progressBar = e.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleProgressSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video || !duration) return

    const newTime = (parseFloat(e.target.value) / 100) * duration
    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Ensure videoUrl is a valid string URL
  const validVideoUrl = videoUrl && typeof videoUrl === 'string' && videoUrl.trim() ? videoUrl.trim() : null

  if (!validVideoUrl) {
    return null
  }

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const showPlayButton = !isPlaying && showControls
  const showPauseButton = isPlaying && showControls
  const showOverlay = showPlayButton || showPauseButton

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden cursor-pointer group"
      onMouseEnter={() => {
        setIsHovered(true)
        if (isPlaying) {
          setShowControls(true)
          if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
          }
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false)
          }, 5000)
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false)
      }}
      onTouchStart={() => {
        if (isPlaying) {
          setShowControls(true)
          setIsHovered(true)
          if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current)
          }
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false)
            setIsHovered(false)
          }, 5000)
        }
      }}
      onClick={handleTogglePlay}
    >
      <video
        key={`lesson-${lessonId}`}
        ref={videoRef}
        src={validVideoUrl}
        className="w-full h-full object-cover"
        preload="auto"
        muted={false}
        playsInline
        crossOrigin="anonymous"
        loop={false}
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
      
      {/* Progress bar and controls at the bottom */}
      {duration > 0 && (
        <div 
          className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 sm:p-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Clickable progress bar */}
          <div 
            className="relative w-full h-1.5 sm:h-2 bg-white/20 rounded-full mb-2 cursor-pointer group/progress"
            onClick={handleProgressClick}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Seekable range input overlay */}
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              step="0.1"
              onChange={handleProgressSeek}
              onMouseDown={() => setIsSeeking(true)}
              onMouseUp={() => setIsSeeking(false)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ zIndex: 10 }}
            />
          </div>
          
          {/* Controls row */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-white text-xs sm:text-sm font-mono tabular-nums min-w-[3ch]">
                {formatTime(currentTime)}
              </span>
              <span className="text-white/70 text-xs">/</span>
              <span className="text-white text-xs sm:text-sm font-mono tabular-nums min-w-[3ch]">
                {formatTime(duration)}
              </span>
            </div>
            
            {/* Fullscreen button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                toggleFullscreen()
              }}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-white/20 text-white"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
