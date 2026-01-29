import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface UseHLSOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  src: string | null | undefined
  onError?: (error: Error) => void
}

/**
 * Hook to handle HLS playback with YouTube-like buffering
 * Automatically detects .m3u8 URLs and initializes HLS.js for non-Safari browsers
 * Uses native HLS for Safari
 */
export function useHLS({ videoRef, src, onError }: UseHLSOptions) {
  const hlsRef = useRef<Hls | null>(null)
  const [isHLS, setIsHLS] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) {
      return
    }

    // Check if URL is HLS (.m3u8)
    const isHLSFile = src.includes('.m3u8')
    setIsHLS(isHLSFile)

    if (!isHLSFile) {
      // Not an HLS file, use native video playback
      video.src = src
      return
    }

    // Check if browser supports native HLS (Safari)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    
    if (isSafari && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari has native HLS support - use it directly
      video.src = src
      return
    }

    // For non-Safari browsers, use HLS.js with YouTube-like buffering config
    if (Hls.isSupported()) {
      setIsLoading(true)
      
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // YouTube-like buffering configuration
        backBufferLength: 90,              // Keep 90s behind current position
        maxBufferLength: 60,               // Buffer 60s ahead (YouTube-like)
        maxMaxBufferLength: 120,           // Up to 2min on fast networks
        maxBufferSize: 60 * 1000 * 1000,  // 60MB buffer
        maxBufferHole: 0.5,                // Max gap tolerance
        highBufferWatchdogPeriod: 2,       // Check buffer health every 2s
        nudgeOffset: 0.1,                  // Small seek adjustments
        nudgeMaxRetry: 3,                  // Retry failed segments
        maxFragLoadingTimeOut: 200,       // 200ms timeout for segments
        maxLoadingDelay: 4,                // Max delay before switching quality
        minAutoBitrate: 0,                 // Allow lowest quality if needed
        // Adaptive bitrate switching
        abrEwmaDefaultEstimate: 500000,   // Initial bandwidth estimate (500kbps)
        abrBandWidthFactor: 0.95,          // Conservative bandwidth factor
        abrBandWidthUpFactor: 0.7,        // More conservative when upgrading
        abrMaxWithRealBitrate: false,     // Don't limit based on real bitrate
      })

      hlsRef.current = hls

      // Load the manifest
      hls.loadSource(src)
      hls.attachMedia(video)

      // Handle HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        setError(null)
        // Auto-play if video is ready
        if (video.paused) {
          video.play().catch(() => {
            // Auto-play was prevented, that's okay
          })
        }
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        setIsLoading(false)
        
        if (data.fatal) {
          let errorMessage = 'HLS playback error'
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              errorMessage = 'Network error while loading HLS stream'
              // Try to recover
              if (data.fatal && hls) {
                try {
                  hls.startLoad()
                } catch (e) {
                  const error = new Error(errorMessage)
                  setError(error)
                  onError?.(error)
                  // Fallback to direct video if available
                  if (src && !src.includes('.m3u8')) {
                    video.src = src.replace('.m3u8', '.mp4')
                  }
                }
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              errorMessage = 'Media error while playing HLS stream'
              // Try to recover
              if (data.fatal && hls) {
                try {
                  hls.recoverMediaError()
                } catch (e) {
                  const error = new Error(errorMessage)
                  setError(error)
                  onError?.(error)
                }
              }
              break
            default:
              errorMessage = 'Unknown HLS error'
              const error = new Error(errorMessage)
              setError(error)
              onError?.(error)
              break
          }
        }
      })

      // Cleanup function
      return () => {
        if (hls) {
          hls.destroy()
          hlsRef.current = null
        }
      }
    } else {
      // HLS.js not supported - fallback to direct video
      const error = new Error('HLS.js is not supported in this browser')
      setError(error)
      onError?.(error)
      // Try to fallback to .mp4 if available
      if (src.includes('.m3u8')) {
        video.src = src.replace('.m3u8', '.mp4')
      } else {
        video.src = src
      }
    }
  }, [src, videoRef, onError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [])

  return {
    isHLS,
    isLoading,
    error,
    hls: hlsRef.current,
  }
}
