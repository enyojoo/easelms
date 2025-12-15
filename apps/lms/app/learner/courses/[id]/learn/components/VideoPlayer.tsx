"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { extractVimeoId, getVimeoEmbedUrl } from "@/lib/vimeo/utils"

interface VideoPlayerProps {
  lessonTitle: string
  onComplete: () => void
  autoPlay?: boolean
  isActive: boolean
  videoUrl?: string // Vimeo URL or video ID
  vimeoVideoId?: string // Direct Vimeo video ID
}

export default function VideoPlayer({
  lessonTitle,
  onComplete,
  autoPlay = true,
  isActive,
  videoUrl,
  vimeoVideoId,
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
  let timeoutId: NodeJS.Timeout | undefined

  // Extract Vimeo video ID
  const vimeoId = vimeoVideoId || (videoUrl ? extractVimeoId(videoUrl) : null)
  const isVimeoVideo = !!vimeoId

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
          setCurrentTime(data.data?.seconds || 0)
          break
        case "loaded":
          setDuration(data.data?.duration || 0)
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
  }, [isVimeoVideo, isActive, onComplete])

  // HTML5 video player (fallback for non-Vimeo videos)
  useEffect(() => {
    if (isVimeoVideo) return

    const video = videoRef.current
    if (video) {
      video.addEventListener("timeupdate", handleTimeUpdate)
      video.addEventListener("loadedmetadata", handleLoadedMetadata)
      video.addEventListener("ended", handleVideoComplete)

      if (isActive) {
        if (autoPlay || isPlaying) {
          video.play().catch((error) => {
            console.error("Video play was prevented:", error)
            setIsPlaying(false)
          })
        }
      } else {
        video.pause()
        setIsPlaying(false)
      }

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate)
        video.removeEventListener("loadedmetadata", handleLoadedMetadata)
        video.removeEventListener("ended", handleVideoComplete)
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
      ) : (
        <video
          ref={videoRef}
          className={`w-full h-full ${isFullscreen ? "object-contain" : "object-cover"}`}
          src={videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
        />
      )}
      {showControls && !isVimeoVideo && ( // Vimeo has its own controls, only show custom controls for HTML5 video
        <div className="absolute inset-0 flex items-end">
          <div className="w-full bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between mb-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="w-full mr-4"
              />
              <span className="text-white text-sm whitespace-nowrap ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSkipBack}
                  className="text-white hover:bg-white/20"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={togglePlay} className="text-white hover:bg-white/20">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSkipForward}
                  className="text-white hover:bg-white/20"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="icon" variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                />
                <Button size="icon" variant="ghost" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
