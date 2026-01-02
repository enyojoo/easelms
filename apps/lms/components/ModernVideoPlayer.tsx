"use client"

import { useRef, useEffect, useState } from "react"
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerSeekBackwardButton,
  VideoPlayerSeekForwardButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
} from "@/components/kibo-ui/video-player"
import { Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ModernVideoPlayerProps {
  src: string
  poster?: string
  autoplay?: boolean
  controls?: boolean
  onReady?: (player: HTMLVideoElement) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  className?: string
}

export default function ModernVideoPlayer({
  src,
  poster,
  autoplay = false,
  controls = true,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  className = "",
}: ModernVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Cleanup: Pause and reset video when src changes or component unmounts
  useEffect(() => {
    return () => {
      const video = videoRef.current
      if (video) {
        video.pause()
        video.currentTime = 0
        video.src = "" // Clear video source to stop loading
        video.load() // Reset video element
      }
    }
  }, [src]) // Re-run when src changes

  useEffect(() => {
    const video = videoRef.current
    if (video && onReady) {
      // Create a proxy object that mimics Video.js API for backward compatibility
      const playerProxy = {
        currentTime: (time?: number) => {
          if (time !== undefined) {
            video.currentTime = time
            return playerProxy
          }
          return video.currentTime
        },
        duration: () => video.duration,
        play: () => video.play(),
        pause: () => video.pause(),
        paused: () => video.paused,
        on: (event: string, handler: () => void) => {
          video.addEventListener(event, handler)
          return playerProxy
        },
        off: (event: string, handler: () => void) => {
          video.removeEventListener(event, handler)
          return playerProxy
        },
        src: (source?: { src: string; type: string }) => {
          if (source) {
            video.src = source.src
            return playerProxy
          }
          return { src: video.src, type: "" }
        },
        load: () => {
          video.load()
          return playerProxy
        },
        dispose: () => {
          // Cleanup if needed
        },
        isDisposed: () => false,
        tech: () => ({ el: () => video }),
        dimensions: (width: string, height: string) => {
          if (width) video.style.width = width
          if (height) video.style.height = height
          return playerProxy
        },
        // Expose the actual video element
        el: () => video,
      }
      onReady(playerProxy as any)
    }
  }, [onReady])

  // Aggressive autoplay handling - try to play immediately when autoplay is enabled
  // But only if the video element is actually visible in the viewport
  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !autoplay || !container) return

    // Detect mobile device - only use user agent, not screen size
    // This ensures consistent behavior when resizing browser window
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    // Lower threshold for mobile to start playing faster
    const visibilityThreshold = isMobile ? 0.1 : 0.5

    // Check if element is visible using Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > visibilityThreshold) {
            // Video is visible, try to play
            const attemptPlay = () => {
              if (video.paused && autoplay) {
                // On mobile, try muted first for better autoplay support
                if (isMobile && !video.muted) {
                  video.muted = true
                }
                video.play().catch((error) => {
                  // Silently handle autoplay errors (browser policies)
                  if (error.name !== 'NotAllowedError') {
                    console.error("Error autoplaying video (immediate):", error)
                  }
                })
              }
            }
            attemptPlay()
            // Also try after a microtask to ensure DOM is ready
            Promise.resolve().then(() => {
              attemptPlay()
            })
          } else {
            // Video is not visible, pause it
            if (!video.paused) {
              video.pause()
            }
          }
        })
      },
      {
        threshold: visibilityThreshold,
        rootMargin: isMobile ? '50px' : '0px', // Larger margin on mobile for faster trigger
      }
    )

    observer.observe(container)

    // Fallback: try to play immediately if container is already in view
    const attemptPlay = () => {
      if (video.paused && autoplay) {
        // Check if container is in viewport
        const rect = container.getBoundingClientRect()
        const isInView = rect.top >= 0 && rect.left >= 0 && 
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        
        if (isInView) {
          // On mobile, try muted first for better autoplay support
          if (isMobile && !video.muted) {
            video.muted = true
          }
          video.play().catch((error) => {
            // Silently handle autoplay errors (browser policies)
            if (error.name !== 'NotAllowedError') {
              console.error("Error autoplaying video (immediate):", error)
            }
          })
        }
      }
    }

    // Try immediately
    attemptPlay()

    // Also try after a microtask to ensure DOM is ready
    Promise.resolve().then(() => {
      attemptPlay()
    })

    // Try when video becomes ready
    const handleCanPlay = () => {
      if (autoplay && video.paused) {
        // Check if still in view before playing
        const rect = container.getBoundingClientRect()
        const isInView = rect.top >= 0 && rect.left >= 0 && 
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        
        if (isInView) {
          // On mobile, try muted first for better autoplay support
          if (isMobile && !video.muted) {
            video.muted = true
          }
          attemptPlay()
        }
      }
    }
    const handleLoadedData = () => {
      if (autoplay && video.paused) {
        const rect = container.getBoundingClientRect()
        const isInView = rect.top >= 0 && rect.left >= 0 && 
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        
        if (isInView) {
          // On mobile, try muted first for better autoplay support
          if (isMobile && !video.muted) {
            video.muted = true
          }
          attemptPlay()
        }
      }
    }
    const handleLoadedMetadata = () => {
      if (autoplay && video.paused) {
        const rect = container.getBoundingClientRect()
        const isInView = rect.top >= 0 && rect.left >= 0 && 
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        
        if (isInView) {
          // On mobile, try muted first for better autoplay support
          if (isMobile && !video.muted) {
            video.muted = true
          }
          attemptPlay()
        }
      }
    }

    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("loadeddata", handleLoadedData)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)

    return () => {
      observer.disconnect()
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("loadeddata", handleLoadedData)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      // Pause video when component unmounts or autoplay changes
      if (video && !video.paused) {
        video.pause()
      }
    }
  }, [autoplay])

  // Handle fullscreen changes and orientation changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isFullscreenNow)
      
      // Update video styling when fullscreen changes
      const video = videoRef.current
      const container = containerRef.current
      if (video && container) {
        if (isFullscreenNow) {
          // In fullscreen, ensure video fills the viewport properly
          // The CSS will handle the styling, but we ensure the video element is properly sized
          video.style.objectFit = 'contain' // Use contain in fullscreen to show full video without cropping
        } else {
          // Reset to normal styling
          video.style.objectFit = ''
        }
      }
    }

    const handleOrientationChange = () => {
      // Re-check fullscreen state on orientation change
      setTimeout(() => {
        handleFullscreenChange()
      }, 100)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("mozfullscreenchange", handleFullscreenChange)
    document.addEventListener("MSFullscreenChange", handleFullscreenChange)
    window.addEventListener("orientationchange", handleOrientationChange)
    window.addEventListener("resize", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange)
      window.removeEventListener("orientationchange", handleOrientationChange)
      window.removeEventListener("resize", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container) return

    try {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )

      if (!isCurrentlyFullscreen) {
        // Enter fullscreen - request on video element for better mobile support
        const elementToFullscreen = video || container
        
        if (elementToFullscreen.requestFullscreen) {
          await elementToFullscreen.requestFullscreen()
        } else if ((elementToFullscreen as any).webkitRequestFullscreen) {
          // Safari
          await (elementToFullscreen as any).webkitRequestFullscreen()
        } else if ((elementToFullscreen as any).mozRequestFullScreen) {
          // Firefox
          await (elementToFullscreen as any).mozRequestFullScreen()
        } else if ((elementToFullscreen as any).msRequestFullscreen) {
          // IE/Edge
          await (elementToFullscreen as any).msRequestFullscreen()
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error)
    }
  }

  // Don't render if no valid src
  if (!src || !src.trim() || src.includes("your_cloudfront_domain") || src.includes("your-cloudfront-domain")) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)} style={{ width: '100%', height: '100%', minHeight: '200px' }}>
        <p className="text-muted-foreground text-sm">No video source provided</p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className={cn("w-full h-full flex items-center justify-center", className)}
    >
      <VideoPlayer
        className={cn(
          "overflow-hidden border w-full h-full flex items-center justify-center",
          isFullscreen && "border-0"
        )}
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}
      >
      <VideoPlayerContent
        ref={videoRef}
        crossOrigin="anonymous"
        muted={false}
        preload="auto"
        slot="media"
        src={src.trim()}
        poster={poster}
        autoPlay={autoplay}
        className="w-full h-full"
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: isFullscreen ? 'contain' : 'cover' // Use contain in fullscreen to show full video
        }}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget
          if (onReady) {
            // Create proxy after metadata is loaded
            const playerProxy = {
              currentTime: (time?: number) => {
                if (time !== undefined) {
                  video.currentTime = time
                  return playerProxy
                }
                return video.currentTime
              },
              duration: () => video.duration,
              play: () => video.play(),
              pause: () => video.pause(),
              paused: () => video.paused,
              on: (event: string, handler: () => void) => {
                video.addEventListener(event, handler)
                return playerProxy
              },
              off: (event: string, handler: () => void) => {
                video.removeEventListener(event, handler)
                return playerProxy
              },
              src: (source?: { src: string; type: string }) => {
                if (source) {
                  video.src = source.src
                  return playerProxy
                }
                return { src: video.src, type: "" }
              },
              load: () => {
                video.load()
                return playerProxy
              },
              dispose: () => {},
              isDisposed: () => false,
              tech: () => ({ el: () => video }),
              dimensions: (width: string, height: string) => {
                if (width) video.style.width = width
                if (height) video.style.height = height
                return playerProxy
              },
              el: () => video,
            }
            onReady(playerProxy as any)
          }
        }}
        onPlay={() => {
          onPlay?.()
        }}
        onPause={() => {
          onPause?.()
        }}
        onEnded={() => {
          onEnded?.()
        }}
        onTimeUpdate={(e) => {
          const video = e.currentTarget
          if (onTimeUpdate && video.duration) {
            onTimeUpdate(video.currentTime, video.duration)
          }
        }}
      />
      {controls && (
        <VideoPlayerControlBar>
          <VideoPlayerPlayButton />
          <VideoPlayerTimeRange />
          <VideoPlayerTimeDisplay showDuration />
          {/* Hide volume controls on mobile */}
          <div className="hidden sm:flex items-center">
            <VideoPlayerMuteButton />
            <VideoPlayerVolumeRange />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="p-2.5 h-auto w-auto"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>
        </VideoPlayerControlBar>
      )}
      </VideoPlayer>
    </div>
  )
}
