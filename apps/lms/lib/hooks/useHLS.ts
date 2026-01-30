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
    
    // For MP4 videos, try to use HLS if available
    // Construct HLS URL from MP4 URL using the same logic as getHLSVideoUrl
    let hlsUrl: string | null = null
    if (!isHLSFile && (src.includes('.mp4') || src.includes('.webm') || src.includes('/video-') || src.includes('/preview-video-'))) {
      // Extract S3 key from URL (handles both S3 URLs and CDN URLs)
      try {
        const url = new URL(src)
        let s3Key: string | null = null
        
        // Extract S3 key from pathname (works for both S3 and Azure Front Door)
        if (url.pathname) {
          s3Key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname
        }
        
        if (s3Key) {
          // Use same logic as getHLSVideoUrl: path/hls/baseName/master.m3u8
          const lastSlashIndex = s3Key.lastIndexOf('/')
          const path = lastSlashIndex >= 0 ? s3Key.substring(0, lastSlashIndex) : ''
          const filename = lastSlashIndex >= 0 ? s3Key.substring(lastSlashIndex + 1) : s3Key
          const baseName = filename.replace(/\.[^/.]+$/, '')
          const hlsKey = path ? `${path}/hls/${baseName}/master.m3u8` : `hls/${baseName}/master.m3u8`
          
          // Construct full HLS URL using same origin
          hlsUrl = `${url.origin}/${hlsKey}`
        }
      } catch (e) {
        // Invalid URL, skip HLS
        console.warn('Failed to construct HLS URL:', e)
      }
    }

    setIsHLS(isHLSFile || !!hlsUrl)

    if (!isHLSFile && !hlsUrl) {
      // Not an HLS file and no HLS URL to try, use native video playback
      video.src = src
      return
    }

    // Use HLS URL if we constructed one, otherwise use the original src
    const hlsSrc = hlsUrl || src

    // Check if browser supports native HLS (Safari)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    
    if (isSafari && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari has native HLS support - use it directly
      // Try HLS first, fallback to MP4 if not available
      if (hlsUrl) {
        video.src = hlsUrl
        // Fallback to MP4 if HLS fails
        video.addEventListener('error', () => {
          if (video.error && video.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            video.src = src
          }
        }, { once: true })
      } else {
        video.src = hlsSrc
      }
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
      hls.loadSource(hlsSrc)
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
              // Check if it's a 403/404 (HLS doesn't exist) - fallback to MP4
              const isNotFound = data.details === 'manifestLoadError' || 
                                data.response?.code === 403 || 
                                data.response?.code === 404 ||
                                (data.response && (data.response.code === 403 || data.response.code === 404))
              
              if (isNotFound) {
                // HLS manifest doesn't exist, fallback to original MP4
                if (hlsUrl && src && !src.includes('.m3u8')) {
                  console.log('HLS not available (transcoding may still be in progress), falling back to MP4:', {
                    hlsUrl,
                    mp4Url: src,
                    errorDetails: data.details,
                    responseCode: data.response?.code
                  })
                  if (hls) {
                    hls.destroy()
                    hlsRef.current = null
                  }
                  setIsHLS(false)
                  setIsLoading(false)
                  video.src = src
                  return
                }
              }
              // Try to recover for other network errors
              if (data.fatal && hls) {
                try {
                  hls.startLoad()
                } catch (e) {
                  const error = new Error(errorMessage)
                  setError(error)
                  onError?.(error)
                  // Fallback to direct video if available
                  if (hlsUrl && src && !src.includes('.m3u8')) {
                    console.log('HLS recovery failed, falling back to MP4:', src)
                    if (hls) {
                      hls.destroy()
                      hlsRef.current = null
                    }
                    setIsHLS(false)
                    video.src = src
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
      if (hlsUrl && src && !src.includes('.m3u8')) {
        video.src = src
      } else if (src.includes('.m3u8')) {
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
