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
  const [bufferAhead, setBufferAhead] = useState(0) // Track how much video is buffered ahead (in seconds)
  const [bufferedRanges, setBufferedRanges] = useState<Array<{ start: number; end: number }>>([]) // Track buffered time ranges
  const [networkSpeed, setNetworkSpeed] = useState<'fast' | 'medium' | 'slow'>('fast') // Network speed detection
  const [bufferTarget, setBufferTarget] = useState(10) // Target buffer ahead in seconds (adaptive)
  const [retryCount, setRetryCount] = useState(0) // Retry count for error recovery
  const autoplayProcessedRef = useRef(false)
  const wasPlayingBeforeFullscreenRef = useRef(false) // Track if video was playing before fullscreen
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Timeout for auto-resume

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
  // Also explicitly reset video state to prevent cache issues
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      // Explicitly reset video state when src changes to prevent browser cache issues
      // This ensures a clean state even if the browser has cached the video
      video.pause()
      video.currentTime = 0
      // Call load() to reset the video element and clear any cached state
      video.load()
    }
    autoplayProcessedRef.current = false
    setIsLoading(true) // Start with loading true - show spinner immediately when video starts loading
    setRetryCount(0) // Reset retry count on new video
  }, [src])

  // Network speed detection and adaptive buffer target
  useEffect(() => {
    const updateNetworkSpeed = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection
      
      if (connection) {
        const effectiveType = connection.effectiveType
        const downlink = connection.downlink || 0
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1) {
          setNetworkSpeed('slow')
          setBufferTarget(8) // Increased from 5 - buffer more to prevent hanging
        } else if (effectiveType === '3g' || downlink < 5) {
          setNetworkSpeed('medium')
          setBufferTarget(12) // Increased from 8
        } else {
          setNetworkSpeed('fast')
          setBufferTarget(20) // Increased from 15 - buffer more aggressively
        }
      } else {
        // Default to medium if connection API not available
        setNetworkSpeed('medium')
        setBufferTarget(10)
      }
    }
    
    // Initial detection
    updateNetworkSpeed()
    
    // Listen for network changes
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    if (connection && connection.addEventListener) {
      connection.addEventListener('change', updateNetworkSpeed)
      return () => {
        if (connection.removeEventListener) {
          connection.removeEventListener('change', updateNetworkSpeed)
        }
      }
    }
  }, [])

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

    // Check initial state - if video is already ready (cached), hide loading
    // Otherwise, keep loading visible until video can play
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && !video.paused) {
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

  // Monitor buffer progress - YouTube-like buffering with adaptive management
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateBufferInfo = () => {
      if (video.buffered.length > 0) {
        const currentTime = video.currentTime
        const duration = video.duration || 0
        
        // Calculate buffered ranges
        const ranges: Array<{ start: number; end: number }> = []
        for (let i = 0; i < video.buffered.length; i++) {
          ranges.push({
            start: video.buffered.start(i),
            end: video.buffered.end(i),
          })
        }
        setBufferedRanges(ranges)
        
        // Find the buffered range that contains current time (more robust)
        let bufferedEnd = currentTime
        let foundRange = false
        
        // First, try to find range containing current time
        for (let i = 0; i < video.buffered.length; i++) {
          const rangeStart = video.buffered.start(i)
          const rangeEnd = video.buffered.end(i)
          // Use small tolerance for floating point comparison
          if (currentTime >= rangeStart - 0.1 && currentTime <= rangeEnd + 0.1) {
            bufferedEnd = rangeEnd
            foundRange = true
            break
          }
        }
        
        // If current time is not in any buffered range, find the next buffered range
        if (!foundRange) {
          let nextRangeStart = Infinity
          for (let i = 0; i < video.buffered.length; i++) {
            const rangeStart = video.buffered.start(i)
            if (rangeStart > currentTime && rangeStart < nextRangeStart) {
              nextRangeStart = rangeStart
              bufferedEnd = video.buffered.end(i)
            }
          }
          
          // If no future range, use the last buffered range
          if (nextRangeStart === Infinity && video.buffered.length > 0) {
            bufferedEnd = video.buffered.end(video.buffered.length - 1)
          }
        }
        
        // Calculate how much is buffered ahead
        const ahead = Math.max(0, bufferedEnd - currentTime)
        setBufferAhead(ahead)
        
        // Adaptive buffer management
        const bufferThreshold = bufferTarget * 0.5 // 50% of target (less aggressive)
        
        // Show loading if buffer is below threshold and video is playing
        if (ahead < bufferThreshold && !video.paused && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
          setIsLoading(true)
        } else if (ahead >= bufferThreshold || video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          setIsLoading(false)
        }
        
        // Only auto-pause if buffer is critically low AND video is actually stuttering
        // Don't auto-pause if video is still playing smoothly (even with low buffer)
        // This prevents unnecessary pauses that cause "hanging"
        // Reduced threshold from 2s to 0.5s - only pause if truly no data available
        if (ahead < 0.5 && !video.paused && networkSpeed === 'slow' && video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          // Only pause if video truly can't play (readyState indicates no data)
          const wasPlaying = !video.paused
          video.pause()
          
          // Show spinner to communicate buffering to user
          setIsLoading(true)
          
          // Clear any existing resume timeout
          if (resumeTimeoutRef.current) {
            clearTimeout(resumeTimeoutRef.current)
          }
          
          // Auto-resume when buffer recovers (more aggressive resume)
          const checkAndResume = () => {
            if (video.buffered.length > 0) {
              const newBufferedEnd = video.buffered.end(video.buffered.length - 1)
              const newBufferAhead = newBufferedEnd - video.currentTime
              
              // Resume as soon as we have enough data (2 seconds) to reduce perceived lag
              if (newBufferAhead > 2 && wasPlaying && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
                setIsLoading(false) // Hide spinner when resuming
                video.play().catch(() => {
                  // If play fails, user can manually resume
                  setIsLoading(false) // Hide spinner even if play fails
                })
                video.removeEventListener('progress', checkAndResume)
              }
            }
          }
          
          video.addEventListener('progress', checkAndResume)
          
          // Check more frequently for faster resume
          resumeTimeoutRef.current = setTimeout(() => {
            checkAndResume()
            video.removeEventListener('progress', checkAndResume)
          }, 1000) // Check every 1 second instead of 2
        }
      }
    }

    // Update buffer info on progress (new data loaded)
    video.addEventListener("progress", updateBufferInfo)
    // Update buffer info on time update (playback position changed)
    video.addEventListener("timeupdate", updateBufferInfo)
    // Update buffer info when metadata loads
    video.addEventListener("loadedmetadata", updateBufferInfo)
    
    // Proactive buffering - ensure video continues to buffer ahead (YouTube-like)
    // Continue buffering even when paused - this provides smooth playback when user resumes
    const proactiveBufferCheck = setInterval(() => {
      if (!video.duration || video.duration === 0) return // Wait for metadata
      
      const currentTime = video.currentTime
      let bufferedEnd = currentTime
      let bufferAhead = 0
      
      // Calculate buffer ahead
      if (video.buffered.length > 0) {
        bufferedEnd = video.buffered.end(video.buffered.length - 1)
        bufferAhead = bufferedEnd - currentTime
      }
      
      // Continue buffering when paused if buffer is below target (YouTube behavior)
      // This ensures video is ready to play smoothly when user resumes
      const shouldContinueBuffering = video.paused 
        ? bufferAhead < bufferTarget // When paused, buffer up to target
        : bufferAhead < bufferTarget * 0.8 // When playing, buffer up to 80% of target
      
      // If buffer is getting low, encourage browser to fetch more
      // Browser will automatically request next segment via Range requests
      if (shouldContinueBuffering && video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        // Access buffered property to encourage browser to continue fetching
        // This is a hint to the browser to be more aggressive with buffering
        void video.buffered.length
        
        // When paused, use seek-ahead technique to force buffering
        // This is more aggressive and ensures buffering continues even when paused
        if (video.paused && video.duration > 0) {
          const seekAhead = Math.min(currentTime + bufferTarget, video.duration)
          // Only seek if we haven't buffered that far yet
          if (bufferedEnd < seekAhead - 0.5) {
            // Temporarily seek ahead to trigger buffering, then restore position
            // This forces the browser to fetch the next segment
            const savedTime = video.currentTime
            try {
              video.currentTime = seekAhead
              // Small delay to let browser start fetching, then restore
              setTimeout(() => {
                if (video && video.paused) {
                  video.currentTime = savedTime
                }
              }, 50)
            } catch (e) {
              // If seek fails, restore immediately
              video.currentTime = savedTime
            }
          }
        }
      }
    }, 500) // Check every 500ms for more responsive buffering when paused

    return () => {
      video.removeEventListener("progress", updateBufferInfo)
      video.removeEventListener("timeupdate", updateBufferInfo)
      video.removeEventListener("loadedmetadata", updateBufferInfo)
      clearInterval(proactiveBufferCheck)
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
      }
    }
  }, [src, bufferTarget, networkSpeed])

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

  // Prevent right-click and copy operations to protect video URL
  const handleContextMenu = (e: React.MouseEvent | MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  const handleKeyDown = (e: React.KeyboardEvent | KeyboardEvent) => {
    // Prevent common copy/save shortcuts
    const isModifier = (e as KeyboardEvent).metaKey || (e as KeyboardEvent).ctrlKey
    const key = (e as KeyboardEvent).key.toLowerCase()
    
    // Block: Ctrl+C (copy), Ctrl+A (select all), Ctrl+S (save), Ctrl+P (print)
    if (isModifier && (key === 'c' || key === 'a' || key === 's' || key === 'p')) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
    
    // Block: F12 (DevTools), Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console)
    if (key === 'f12' || (isModifier && (e as KeyboardEvent).shiftKey && (key === 'i' || key === 'j'))) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }

  // Add native event listeners directly to video element to ensure right-click blocking works
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleNativeContextMenu = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    const handleNativeKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(e)
    }

    // Attach native event listeners with capture phase to catch events before they bubble
    video.addEventListener('contextmenu', handleNativeContextMenu, true)
    video.addEventListener('keydown', handleNativeKeyDown, true)
    
    // Also prevent default drag behavior that could expose video URL
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
      return false
    }
    video.addEventListener('dragstart', handleDragStart, true)

    return () => {
      video.removeEventListener('contextmenu', handleNativeContextMenu, true)
      video.removeEventListener('keydown', handleNativeKeyDown, true)
      video.removeEventListener('dragstart', handleDragStart, true)
    }
  }, [src])

  return (
    <div 
      ref={containerRef} 
      className={cn("w-full h-full", className)}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
      }}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
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
      {/* Loading overlay - always visible when buffering, regardless of hover */}
      {/* High z-index ensures it's above everything, pointer-events-none allows controls to work */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}
      <VideoPlayerContent
        ref={videoRef}
        crossOrigin={src?.includes('s3.amazonaws.com') || src?.includes('amazonaws.com') || src?.includes('azurefd.net') ? undefined : "anonymous"}
        preload={isHLSFile ? "auto" : "metadata"}
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
          objectFit: 'contain', // Use contain (like Netflix/YouTube) to show complete video without cropping
          // Optimize for streaming and hardware acceleration
          transform: 'translateZ(0)',
          willChange: 'auto',
        }}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        // Ensure video continues buffering even when paused (helps prevent hanging)
        onLoadedData={(e) => {
          const video = e.currentTarget
          // Once data is loaded, ensure browser continues to buffer ahead
          if (video.buffered.length > 0) {
            // Access buffered property to encourage browser to continue fetching
            void video.buffered.length
          }
        }}
        onError={(e) => {
          const video = e.currentTarget
          if (video.error) {
            const errorCode = video.error.code
            const maxRetries = 3
            
            // Network error - retry with exponential backoff
            // MediaError.MEDIA_ERR_NETWORK = 2 (network error code)
            const MEDIA_ERR_NETWORK = 2
            if (errorCode === MEDIA_ERR_NETWORK && retryCount < maxRetries) {
              const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
              
              setTimeout(() => {
                setRetryCount(prev => prev + 1)
                video.load() // Retry loading
                video.play().catch(() => {
                  // If play fails, user can manually retry
                })
              }, delay)
              
              setIsLoading(true)
              return
            }
            
            // Other errors or max retries reached
            setIsLoading(false)
            
            // Only log if it's a real error (not just loading)
            const hasRealError = errorCode !== undefined && errorCode !== 0
            const hasErrorMessage = video.error.message && video.error.message.trim() !== ""
            
            if (hasRealError || hasErrorMessage) {
              console.error("Video playback error:", {
                code: errorCode,
                message: video.error.message,
                networkState: video.networkState,
                readyState: video.readyState,
                videoSrc: video.src,
                expectedSrc: src,
                retryCount,
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
          
          // Encourage aggressive buffering when playing starts
          // Access buffered property to encourage browser to continue fetching ahead
          if (video.buffered.length > 0) {
            void video.buffered.length
          }
          
          onPlay?.()
        }}
        onPause={() => {
          // Continue buffering when paused (YouTube-like behavior)
          const video = videoRef.current
          if (video && video.buffered.length > 0) {
            // Access buffered property to encourage browser to continue fetching ahead
            void video.buffered.length
          }
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
          
          // Encourage continued buffering while playing
          // Periodically access buffered to encourage browser to fetch ahead
          if (!video.paused && video.buffered.length > 0) {
            // Only check occasionally to avoid performance impact
            if (Math.random() < 0.1) { // 10% chance per timeupdate
              void video.buffered.length
            }
          }
        }}
        onSeeking={(e) => {
          // Optimize seeking - ensure video is ready before seeking
          const video = e.currentTarget
          // Browser handles seeking, but we can ensure smooth transition
          if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
            // Wait for metadata before allowing seek
            video.load()
          }
        }}
        onSeeked={(e) => {
          // After seeking, ensure playback is smooth
          const video = e.currentTarget
          // If video was playing before seek, ensure it continues
          if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            // Video is ready, playback should continue smoothly
          }
        }}
      />
      {controls && (
        <VideoPlayerControlBar>
          <VideoPlayerPlayButton />
          <div className="relative flex-1 flex items-center min-w-0">
            {/* Buffer progress indicator (YouTube-like) - shows behind the progress bar */}
            {bufferedRanges.length > 0 && videoRef.current && videoRef.current.duration > 0 && (
              <div 
                className="absolute left-0 right-0 pointer-events-none"
                style={{ 
                  height: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 0,
                  margin: '0 10px',
                }}
              >
                {bufferedRanges.map((range, index) => {
                  const duration = videoRef.current?.duration || 1
                  if (duration === 0) return null
                  
                  const startPercent = Math.max(0, Math.min(100, (range.start / duration) * 100))
                  const endPercent = Math.max(0, Math.min(100, (range.end / duration) * 100))
                  const width = Math.max(0, endPercent - startPercent)
                  
                  if (width <= 0) return null
                  
                  // Color based on buffer health
                  const bufferHealth = bufferAhead / bufferTarget
                  let bufferColor = 'bg-white/30' // Default
                  if (bufferHealth < 0.5) {
                    bufferColor = 'bg-yellow-400/40' // Low buffer
                  } else if (bufferHealth < 0.7) {
                    bufferColor = 'bg-white/30' // Medium buffer
                  } else {
                    bufferColor = 'bg-green-400/30' // Good buffer
                  }
                  
                  return (
                    <div
                      key={index}
                      className={`absolute ${bufferColor} rounded-sm transition-colors`}
                      style={{
                        left: `${startPercent}%`,
                        width: `${width}%`,
                        height: '100%',
                      }}
                    />
                  )
                })}
              </div>
            )}
            <VideoPlayerTimeRange 
              // Ensure the time range is interactive and seekable
              style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }}
              className="relative z-10 flex-1"
            />
          </div>
          {/* Network speed indicator (optional, subtle) */}
          {networkSpeed !== 'fast' && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground ml-2">
              <div className={`w-2 h-2 rounded-full ${
                networkSpeed === 'slow' ? 'bg-yellow-500' : 'bg-blue-500'
              }`} />
              <span className="capitalize">{networkSpeed}</span>
            </div>
          )}
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
