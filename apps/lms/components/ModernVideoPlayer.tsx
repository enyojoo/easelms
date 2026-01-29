"use client"

import { useRef, useEffect, useState } from "react"
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
  VideoPlayerFullscreenButton,
} from "@/components/kibo-ui/video-player"
import { Maximize, Minimize, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useHLS } from "@/lib/hooks/useHLS"

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
  const [isLoading, setIsLoading] = useState(true) // Track loading state
  const autoplayProcessedRef = useRef(false)
  const wasPlayingBeforeFullscreenRef = useRef(false) // Track if video was playing before fullscreen

  // Initialize HLS hook for adaptive streaming
  const { isHLS: isHLSFile, isLoading: isHLSLoading, error: hlsError } = useHLS({
    videoRef,
    src,
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

  // Cleanup: Pause and reset video when src changes or component unmounts
  // Also ensure HTML5 controls are always disabled and playsInline is set for iOS/Android
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      // Always disable HTML5 controls - we use custom controls
      // Set both attribute and property to ensure it works on all browsers (especially mobile)
      video.controls = false
      video.removeAttribute('controls')
      ;(video as any).controls = false
      
      // Set playsInline for iOS and Android to prevent auto-fullscreen on play
      // This MUST be set before any play() call to prevent iOS from auto-fullscreening
      const ensurePlaysInline = () => {
        const isFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
        
        if (!isFullscreen) {
          video.setAttribute('playsinline', 'true')
          video.setAttribute('webkit-playsinline', 'true')
          video.setAttribute('x5-playsinline', 'true') // For Android WeChat/QQ browsers
          ;(video as any).playsInline = true
          ;(video as any).webkitPlaysInline = true
        }
      }
      
      // Set immediately
      ensurePlaysInline()
      
      // Intercept play events to ensure playsInline is set before video plays
      const handleBeforePlay = (e: Event) => {
        ensurePlaysInline()
      }
      video.addEventListener('play', handleBeforePlay, true) // Use capture phase
      video.addEventListener('playing', handleBeforePlay, true)
      
      // Continuously monitor and disable controls (browsers, especially mobile, may re-enable them)
      // Also ensure playsInline stays true to prevent auto-fullscreen on iOS/Android
      const checkControlsAndPlaysInline = setInterval(() => {
        if (video) {
          // Disable controls
          if (video.controls) {
            video.controls = false
            video.removeAttribute('controls')
            ;(video as any).controls = false
          }
          
          // Ensure playsInline stays true (unless we're in fullscreen)
          ensurePlaysInline()
        }
      }, 500)
      
      return () => {
        video.removeEventListener('play', handleBeforePlay, true)
        video.removeEventListener('playing', handleBeforePlay, true)
        clearInterval(checkControlsAndPlaysInline)
      }
    }
    
    return () => {
      // Don't pause or reset video on cleanup - preserve video state across viewport changes
      // This ensures video continues playing when viewport changes (e.g., DevTools responsive mode)
      // The cleanup only runs when src changes, not on viewport changes
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
          return { src: video.src, type: video.getAttribute('type') || '' }
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

  // Reset autoplay processed flag when src changes
  useEffect(() => {
    autoplayProcessedRef.current = false
    setIsLoading(false) // Start with loading false - only show spinner when actually buffering
  }, [src])

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
      // Video can start playing - hide spinner
      setIsLoading(false)
    }

    const handleCanPlayThrough = () => {
      // Video can play through without stopping - hide spinner
      setIsLoading(false)
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

  // Aggressive autoplay handling - try to play immediately when autoplay is enabled
  // But only if the video element is actually visible in the viewport
  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !autoplay || !container) {
      // If autoplay is disabled, don't do anything - let video state persist
      return
    }

    // If video is already playing, never try to play again (preserves state across viewport changes)
    if (!video.paused) {
      autoplayProcessedRef.current = true
      return
    }

    // Track if we're currently attempting to play to prevent conflicts
    let isAttemptingPlay = false
    let playTimeoutId: NodeJS.Timeout | null = null

    // Helper to check if video has valid source
    const hasValidSource = () => {
      if (!video.src || video.src.trim() === '' || 
          video.src.includes('your_cloudfront_domain') || 
          video.src.includes('your-cloudfront-domain')) {
        return false
      }
      
      // Check if video has error
      if (video.error && video.error.code !== 0) {
        return false
      }
      
      // Allow play attempt if readyState is at least HAVE_NOTHING (0) or higher
      // We'll wait for metadata in the event handlers
      return video.readyState >= HTMLMediaElement.HAVE_NOTHING
    }

    // Safe play function that checks source validity
    const attemptPlay = () => {
      // Don't attempt if already attempting, no valid source, or video is already playing
      if (isAttemptingPlay || !video.src || video.src.trim() === '' || !video.paused) {
        return
      }
      
      // If we've already processed autoplay for this src, don't try again
      if (autoplayProcessedRef.current) {
        return
      }

      // Check if video has error (only if it's a real error, not code 0)
      if (video.error && video.error.code !== 0) {
        console.error("Video has error, cannot play:", video.error)
        return
      }

      // Only attempt if video has at least loaded nothing (0) or higher
      // We'll let the event handlers handle when metadata is ready
      if (video.readyState < HTMLMediaElement.HAVE_NOTHING) {
        return
      }

      // Ensure playsInline is set BEFORE calling play() to prevent iOS/Android auto-fullscreen
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      if (!isFullscreen) {
        video.setAttribute('playsinline', 'true')
        video.setAttribute('webkit-playsinline', 'true')
        video.setAttribute('x5-playsinline', 'true')
        ;(video as any).playsInline = true
        ;(video as any).webkitPlaysInline = true
      }

      isAttemptingPlay = true
      autoplayProcessedRef.current = true
      const playPromise = video.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isAttemptingPlay = false
          })
          .catch((error) => {
            isAttemptingPlay = false
            // Silently handle autoplay errors (browser policies and abort errors)
            if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
              console.error("Error autoplaying video:", error)
            }
          })
      } else {
        isAttemptingPlay = false
      }
    }

    // Try when video source is ready
    const handleCanPlay = () => {
      if (autoplay && hasValidSource()) {
        attemptPlay()
      }
    }

    const handleLoadedData = () => {
      if (autoplay && hasValidSource()) {
        attemptPlay()
      }
    }

    const handleLoadedMetadata = () => {
      if (autoplay && hasValidSource()) {
        attemptPlay()
      }
    }

    // Check if we're on mobile - iOS requires user interaction for autoplay, but Android can autoplay
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isMobile = isIOS || isAndroid
    
    // Try immediately if video already has source (but not on iOS due to autoplay restrictions)
    // Android can autoplay, so we try it
    if (hasValidSource() && !isIOS) {
      attemptPlay()
    }

    // Try after a short delay to ensure DOM is ready (but not on iOS)
    // For Android, try with a slightly longer delay to help with loading
    if (!isIOS) {
      const delay = isAndroid ? 300 : 100 // Give Android more time to load
      playTimeoutId = setTimeout(() => {
        if (hasValidSource()) {
          attemptPlay()
        }
      }, delay)
    }

    // Try when video becomes ready
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("loadeddata", handleLoadedData)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)

    return () => {
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("loadeddata", handleLoadedData)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      if (playTimeoutId) {
        clearTimeout(playTimeoutId)
      }
      // Don't pause video on cleanup - let it continue playing naturally
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
        // Always disable HTML5 controls - we use custom controls
        // This is critical to prevent native download button from appearing
        video.controls = false
        video.removeAttribute('controls')
        ;(video as any).controls = false
        
        // Force disable controls immediately (browsers sometimes re-enable them in fullscreen)
        if (isFullscreenNow) {
          // In fullscreen, ensure video shows completely without cropping
          // Use contain to show entire video (may have black bars but no cropping)
          video.style.objectFit = 'contain'
          video.style.width = '100%'
          video.style.height = '100%'
          // Remove playsInline in fullscreen to allow fullscreen on mobile
          video.removeAttribute('playsinline')
          video.removeAttribute('webkit-playsinline')
          ;(video as any).playsInline = false
          ;(video as any).webkitPlaysInline = false
          
          // Ensure controls stay disabled in fullscreen (browsers, especially mobile, re-enable them)
          // Use multiple timeouts to catch browser re-enabling controls at different stages
          const disableControls = () => {
            if (video) {
              video.controls = false
              video.removeAttribute('controls')
              ;(video as any).controls = false
            }
          }
          setTimeout(disableControls, 0)
          setTimeout(disableControls, 50)
          setTimeout(disableControls, 100)
          setTimeout(disableControls, 200)
          setTimeout(disableControls, 300)
        } else {
          // Reset to normal styling (contain to show full video like Netflix/YouTube)
          video.style.objectFit = 'contain'
          video.style.width = ''
          video.style.height = ''
          // Restore playsInline when exiting fullscreen
          video.setAttribute('playsinline', 'true')
          video.setAttribute('webkit-playsinline', 'true')
          video.setAttribute('x5-playsinline', 'true')
          ;(video as any).playsInline = true
          ;(video as any).webkitPlaysInline = true
          
          // Resume playback if video was playing before fullscreen (mobile fix)
          if (wasPlayingBeforeFullscreenRef.current && video.paused) {
            // Use a small delay to ensure fullscreen transition is complete
            setTimeout(() => {
              if (video && video.paused) {
                video.play().catch((error) => {
                  // Silently handle play errors (user might have paused)
                  console.debug("Could not resume playback after fullscreen:", error)
                })
              }
            }, 100)
          }
          wasPlayingBeforeFullscreenRef.current = false
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
        const isMobile = isIOS || isAndroid
        
        // Remember if video was playing before entering fullscreen (for mobile resume)
        wasPlayingBeforeFullscreenRef.current = !video.paused
        
        // Ensure HTML5 controls are disabled before entering fullscreen
        video.controls = false
        video.removeAttribute('controls')
        ;(video as any).controls = false
        
        try {
          // iOS Safari requires using the video element's webkitEnterFullscreen() method
          // This is the only way to get native fullscreen on iOS
          if (isIOS && (video as any).webkitEnterFullscreen) {
            // Remove playsInline temporarily for iOS fullscreen
            video.removeAttribute('playsinline')
            video.removeAttribute('webkit-playsinline')
            ;(video as any).playsInline = false
            ;(video as any).webkitPlaysInline = false
            
            // Use iOS native fullscreen
            await (video as any).webkitEnterFullscreen()
            
            // Restore playsInline after fullscreen (handled in fullscreen change event)
          } else if (isAndroid && (video as any).webkitEnterFullscreen) {
            // Android Chrome also supports webkitEnterFullscreen
            await (video as any).webkitEnterFullscreen()
          } else {
            // For desktop and other browsers, use container fullscreen
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
          
          // Ensure controls stay disabled after entering fullscreen (critical for mobile)
          // Use multiple timeouts to catch browser re-enabling controls
          setTimeout(() => {
            if (video) {
              video.controls = false
              video.removeAttribute('controls')
              ;(video as any).controls = false
            }
          }, 0)
          setTimeout(() => {
            if (video) {
              video.controls = false
              video.removeAttribute('controls')
              ;(video as any).controls = false
            }
          }, 100)
          setTimeout(() => {
            if (video) {
              video.controls = false
              video.removeAttribute('controls')
              ;(video as any).controls = false
            }
          }, 300)
        } catch (err) {
          console.error("Error entering fullscreen:", err)
          // If fullscreen fails, restore playsInline
          if (video) {
            video.setAttribute('playsinline', 'true')
            video.setAttribute('webkit-playsinline', 'true')
            ;(video as any).playsInline = true
            ;(video as any).webkitPlaysInline = true
          }
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
        
        // Restore playsInline after exiting fullscreen on mobile
        if (video) {
          video.setAttribute('playsinline', 'true')
          video.setAttribute('webkit-playsinline', 'true')
          video.setAttribute('x5-playsinline', 'true')
          ;(video as any).playsInline = true
          ;(video as any).webkitPlaysInline = true
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
      className={cn("w-full h-full", className)}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    >
      <VideoPlayer
        key={src} // Force re-render when src changes
        className={cn(
          "overflow-hidden border w-full h-full",
          isFullscreen && "border-0"
        )}
        style={{ 
          width: '100%', 
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}
      <VideoPlayerContent
        ref={videoRef}
        crossOrigin={src?.includes('s3.amazonaws.com') || src?.includes('amazonaws.com') || src?.includes('azurefd.net') ? undefined : "anonymous"}
        preload={isHLSFile ? "auto" : "auto"}
        slot="media"
        src={isHLSFile ? undefined : (src && typeof src === 'string' ? src.trim() : undefined)}
        poster={poster}
        autoPlay={false}
        controls={false}
        playsInline={true}
        webkit-playsinline="true"
        x5-playsinline="true"
        className="w-full h-full"
        style={{
          width: isFullscreen ? '100vw' : '100%', 
          height: isFullscreen ? '100vh' : '100%', 
          objectFit: 'contain' // Use contain (like Netflix/YouTube) to show complete video without cropping
        }}
        onError={(e) => {
          const video = e.currentTarget
          if (video.error) {
            // Only log if it's a real error (not just loading)
            // video.error.code might be undefined in some browsers, so check both code and message
            const hasRealError = video.error.code !== undefined && video.error.code !== 0
            const hasErrorMessage = video.error.message && video.error.message.trim() !== ""
            
            if (hasRealError || hasErrorMessage) {
              console.error("Video playback error:", {
                code: video.error.code,
                message: video.error.message,
                networkState: video.networkState,
                readyState: video.readyState,
                videoSrc: video.src,
                expectedSrc: src,
                videoSrcAttribute: video.getAttribute('src'),
                videoCurrentSrc: video.currentSrc
              })
            }
          }
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
                return { src: video.src, type: video.getAttribute('type') || '' }
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
        onPlay={(e) => {
          // Ensure playsInline is set before play event propagates (prevents iOS auto-fullscreen)
          const video = e.currentTarget
          const isFullscreen = !!(
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement
          )
          if (!isFullscreen && video) {
            video.setAttribute('playsinline', 'true')
            video.setAttribute('webkit-playsinline', 'true')
            video.setAttribute('x5-playsinline', 'true')
            ;(video as any).playsInline = true
            ;(video as any).webkitPlaysInline = true
          }
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
          // Only update time if video is actually playing (prevents progress bar moving when paused)
          if (onTimeUpdate && video.duration && !video.paused) {
            onTimeUpdate(video.currentTime, video.duration)
          }
        }}
      />
      {controls && (
        <VideoPlayerControlBar>
          <VideoPlayerPlayButton />
          <VideoPlayerTimeRange 
            // Ensure the time range is interactive and seekable
            style={{ cursor: 'pointer' }}
          />
          <VideoPlayerTimeDisplay showDuration />
          {/* Hide volume controls on mobile/tablet */}
          <div className="hidden lg:flex items-center">
            <VideoPlayerMuteButton />
            <VideoPlayerVolumeRange />
          </div>
          {/* Fullscreen button - using custom implementation for better mobile support */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="p-2.5 h-auto w-auto hover:bg-accent"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
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
