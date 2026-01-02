"use client"

import { useState, useRef, useEffect } from "react"
import { extractVimeoId, getVimeoEmbedUrl } from "@/lib/vimeo/utils"
import ModernVideoPlayer from "@/components/ModernVideoPlayer"

interface VideoPlayerProps {
  lessonTitle: string
  onComplete: () => void
  autoPlay?: boolean
  isActive: boolean
  videoUrl?: string // Vimeo URL or video ID
  vimeoVideoId?: string // Direct Vimeo video ID
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
  vimeoVideoId,
  courseId,
  lessonId,
  videoProgression = false,
  onProgressUpdate,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const completedRef = useRef(false)
  let timeoutId: NodeJS.Timeout | undefined

  // Extract Vimeo video ID
  const vimeoId = vimeoVideoId || (videoUrl ? extractVimeoId(videoUrl) : null)
  const isVimeoVideo = !!vimeoId

  // Storage key for video progress
  const progressStorageKey = courseId && lessonId ? `course-${courseId}-lesson-${lessonId}-progress` : null

  // Reset completion status when lesson changes
  useEffect(() => {
    completedRef.current = false
  }, [lessonId])

  // Load saved progress
  useEffect(() => {
    if (!videoProgression || !progressStorageKey || !isVimeoVideo) return

    try {
      const savedProgress = localStorage.getItem(progressStorageKey)
      if (savedProgress) {
        const { currentTime: savedTime, duration: savedDuration } = JSON.parse(savedProgress)
        if (savedTime > 0 && savedDuration > 0) {
          setCurrentTime(savedTime)
          // Resume from saved position when video loads
          if (iframeRef.current && savedTime > 5) {
            // Only resume if more than 5 seconds watched
            setTimeout(() => {
              iframeRef.current?.contentWindow?.postMessage(
                { method: "setCurrentTime", value: savedTime },
                "*"
              )
            }, 1000)
          }
        }
      }
    } catch (error) {
      console.error("Error loading video progress:", error)
    }
  }, [videoProgression, progressStorageKey, isVimeoVideo, lessonId])

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

  // Vimeo Player API via postMessage
  useEffect(() => {
    if (!isVimeoVideo || !iframeRef.current) return

    const iframe = iframeRef.current
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Vimeo
      if (!event.origin.includes("vimeo.com")) return

      const data = event.data
      if (typeof data !== "object" || data.event === undefined) return

      switch (data.event) {
        case "play":
          setIsPlaying(true)
          break
        case "pause":
          setIsPlaying(false)
          break
        case "timeupdate":
          const newTime = data.data?.seconds || 0
          setCurrentTime(newTime)
          // Save progress immediately on timeupdate if tracking is enabled
          // Note: duration might not be set yet, so we'll save it in the periodic interval
          break
        case "loaded":
          const newDuration = data.data?.duration || 0
          setDuration(newDuration)
          // Load saved progress after duration is known
          if (videoProgression && progressStorageKey && newDuration > 0) {
            try {
              const savedProgress = localStorage.getItem(progressStorageKey)
              if (savedProgress) {
                const { currentTime: savedTime } = JSON.parse(savedProgress)
                if (savedTime > 5 && savedTime < newDuration) {
                  // Resume from saved position if more than 5 seconds watched
                  setTimeout(() => {
                    iframe.contentWindow?.postMessage(
                      { method: "setCurrentTime", value: savedTime },
                      "*"
                    )
                    setCurrentTime(savedTime)
                  }, 500)
                }
              }
            } catch (error) {
              console.error("Error loading video progress:", error)
            }
          }
          break
        case "ended":
          setIsPlaying(false)
          onComplete()
          break
      }
    }

    window.addEventListener("message", handleMessage)

    // Request video info
    iframe.contentWindow?.postMessage({ method: "getDuration" }, "*")
    iframe.contentWindow?.postMessage({ method: "getCurrentTime" }, "*")

    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [isVimeoVideo, isActive, onComplete, videoProgression, progressStorageKey, duration, onProgressUpdate])

  // HTML5 video player (fallback for non-Vimeo videos)
  useEffect(() => {
    if (isVimeoVideo) return

    const video = videoRef.current
    const container = containerRef.current
    if (video && container) {
      video.addEventListener("timeupdate", handleTimeUpdate)
      video.addEventListener("loadedmetadata", handleLoadedMetadata)
      video.addEventListener("ended", handleVideoComplete)

      // Check if video is actually visible before playing
      const checkVisibility = () => {
        const rect = container.getBoundingClientRect()
        const isInView = rect.top >= 0 && rect.left >= 0 && 
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        return isInView
      }

      if (isActive) {
        // Only play if video is visible
        if (checkVisibility() && (autoPlay || isPlaying)) {
          video.play().catch((error) => {
            console.error("Video play was prevented:", error)
            setIsPlaying(false)
          })
        } else if (!checkVisibility()) {
          // Video not visible, pause it
          video.pause()
          setIsPlaying(false)
        }
      } else {
        // Not active, pause video
        video.pause()
        setIsPlaying(false)
      }

      // Set up intersection observer to pause when not visible
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
              // Video is not visible, pause it
              if (video && !video.paused) {
                video.pause()
                setIsPlaying(false)
              }
            } else if (entry.isIntersecting && isActive && (autoPlay || isPlaying)) {
              // Video is visible and active, try to play
              if (video && video.paused) {
                video.play().catch((error) => {
                  console.error("Video play was prevented:", error)
                  setIsPlaying(false)
                })
              }
            }
          })
        },
        {
          threshold: 0.5,
          rootMargin: '0px',
        }
      )

      observer.observe(container)

      return () => {
        observer.disconnect()
        video.removeEventListener("timeupdate", handleTimeUpdate)
        video.removeEventListener("loadedmetadata", handleLoadedMetadata)
        video.removeEventListener("ended", handleVideoComplete)
        // Pause video on cleanup
        if (video && !video.paused) {
          video.pause()
        }
      }
    }
  }, [autoPlay, lessonTitle, isActive, isPlaying, isVimeoVideo])

  // Set up event listeners for showing/hiding controls
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener("mouseenter", showControlsHandler)
      container.addEventListener("mouseleave", hideControlsHandler)
      container.addEventListener("touchstart", showControlsHandler)

      return () => {
        container.removeEventListener("mouseenter", showControlsHandler)
        container.removeEventListener("mouseleave", hideControlsHandler)
        container.removeEventListener("touchstart", showControlsHandler)
        clearTimeout(timeoutId)
      }
    }
  }, [])

  // Handler functions for showing and hiding controls
  const showControlsHandler = () => {
    setShowControls(true)
    clearTimeout(timeoutId) // Clear any existing timeout
    timeoutId = setTimeout(hideControlsHandler, 3000) // Hide controls after 3 seconds
  }

  const hideControlsHandler = () => setShowControls(false)

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleVideoComplete = () => {
    setIsPlaying(false)
    onComplete()
  }

  const togglePlay = () => {
    if (isVimeoVideo && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        { method: isPlaying ? "pause" : "play" },
        "*"
      )
      setIsPlaying(!isPlaying)
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (value: number[]) => {
    if (isVimeoVideo && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        { method: "setCurrentTime", value: value[0] },
        "*"
      )
      setCurrentTime(value[0])
    } else if (videoRef.current) {
      videoRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0]
      videoRef.current.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted
      videoRef.current.muted = newMutedState
      setIsMuted(newMutedState)
      if (newMutedState) {
        videoRef.current.volume = 0
        setVolume(0)
      } else {
        videoRef.current.volume = volume > 0 ? volume : 1
        setVolume(volume > 0 ? volume : 1)
      }
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  const handleSkipBack = () => {
    if (isVimeoVideo && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        { method: "setCurrentTime", value: Math.max(0, currentTime - 10) },
        "*"
      )
    } else if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10)
    }
  }

  const handleSkipForward = () => {
    if (isVimeoVideo && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        { method: "setCurrentTime", value: Math.min(duration, currentTime + 10) },
        "*"
      )
    } else if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10)
    }
  }

  // Vimeo embed URL
  const vimeoEmbedUrl = vimeoId
    ? getVimeoEmbedUrl(vimeoId, {
        autoplay: autoPlay && isActive,
        controls: true,
        responsive: true,
      })
    : null

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-black">
      {isVimeoVideo && vimeoEmbedUrl ? (
        <iframe
          ref={iframeRef}
          src={vimeoEmbedUrl}
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={lessonTitle}
        />
      ) : videoUrl ? (
        <ModernVideoPlayer
          src={videoUrl}
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
      ) : null}
    </div>
  )
}
