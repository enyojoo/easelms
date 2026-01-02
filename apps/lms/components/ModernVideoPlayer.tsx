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
          return { src: video.src, type: video.type }
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

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("mozfullscreenchange", handleFullscreenChange)
    document.addEventListener("MSFullscreenChange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (container.requestFullscreen) {
          await container.requestFullscreen()
        } else if ((container as any).webkitRequestFullscreen) {
          // Safari
          await (container as any).webkitRequestFullscreen()
        } else if ((container as any).mozRequestFullScreen) {
          // Firefox
          await (container as any).mozRequestFullScreen()
        } else if ((container as any).msRequestFullscreen) {
          // IE/Edge
          await (container as any).msRequestFullscreen()
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
    <div ref={containerRef} className={cn("w-full h-full", className)}>
      <VideoPlayer
        className="overflow-hidden border w-full h-full"
        style={{ width: '100%', height: '100%' }}
      >
      <VideoPlayerContent
        ref={videoRef}
        crossOrigin="anonymous"
        muted={false}
        preload="metadata"
        slot="media"
        src={src.trim()}
        poster={poster}
        autoPlay={autoplay}
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
                return { src: video.src, type: video.type }
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
          <VideoPlayerSeekBackwardButton />
          <VideoPlayerSeekForwardButton />
          <VideoPlayerTimeRange />
          <VideoPlayerTimeDisplay showDuration />
          <VideoPlayerMuteButton />
          <VideoPlayerVolumeRange />
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
