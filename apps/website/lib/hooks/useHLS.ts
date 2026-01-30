import { useEffect, useRef, useState, useCallback } from 'react'
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
  // Track if we've already tried HLS and failed for this source - prevents infinite retry loops
  const hlsFailedForSrcRef = useRef<string | null>(null)
  // Track the current source to prevent re-initialization on same source
  const currentSrcRef = useRef<string | null>(null)
  // Track if HLS is currently initializing to prevent duplicate initialization
  const initializingRef = useRef<boolean>(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) {
      return
    }

    // Prevent re-initialization if already processing the same source
    if (currentSrcRef.current === src || initializingRef.current) {
      return
    }
    
    // Mark as initializing and store current source
    initializingRef.current = true
    currentSrcRef.current = src

    // Check if URL is HLS (.m3u8)
    const isHLSFile = src.includes('.m3u8')
    
    // For MP4 videos, try to use HLS if available
    // Construct HLS URL from MP4 URL using the same logic as getHLSVideoUrl
    let hlsUrl: string | null = null
    if (!isHLSFile && (src.includes('.mp4') || src.includes('.webm') || src.includes('/video-') || src.includes('/preview-video-'))) {
      // Check if we already tried HLS for this source and it failed
      if (hlsFailedForSrcRef.current === src) {
        console.log('HLS previously failed for this source, using MP4 directly:', src)
        setIsHLS(false)
        video.src = src
        return
      }

      // Extract S3 key from URL (handles both S3 URLs and CDN URLs)
      try {
        const url = new URL(src)
        let s3Key: string | null = null
        
        // Extract S3 key from pathname (works for both S3 and Azure Front Door)
        if (url.pathname) {
          s3Key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname
        }
        
        if (s3Key) {
          // Use same logic as getHLSVideoUrl: path/hls/baseName/baseName.m3u8
          // MediaConvert creates the master playlist using the folder name as filename
          const lastSlashIndex = s3Key.lastIndexOf('/')
          const path = lastSlashIndex >= 0 ? s3Key.substring(0, lastSlashIndex) : ''
          const filename = lastSlashIndex >= 0 ? s3Key.substring(lastSlashIndex + 1) : s3Key
          const baseName = filename.replace(/\.[^/.]+$/, '')
          const hlsKey = path ? `${path}/hls/${baseName}/${baseName}.m3u8` : `hls/${baseName}/${baseName}.m3u8`
          
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
            console.log('Safari HLS failed, falling back to MP4:', src)
            hlsFailedForSrcRef.current = src
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
        maxFragLookUpTolerance: 0.25,      // Fragment lookup tolerance
        maxLoadingDelay: 4,                // Max delay before switching quality
        minAutoBitrate: 0,                 // Allow lowest quality if needed
        // Limit retries to prevent infinite loops
        manifestLoadingMaxRetry: 1,        // Only retry manifest load 1 time (fail fast)
        levelLoadingMaxRetry: 1,           // Only retry level load 1 time
        fragLoadingMaxRetry: 2,            // Retry fragment load 2 times
        manifestLoadingRetryDelay: 500,    // 500ms delay between retries (fail fast)
        levelLoadingRetryDelay: 500,
        fragLoadingRetryDelay: 500,
        // Stop retrying on fatal errors immediately
        fragLoadingTimeOut: 2000,          // 2s timeout for fragments
        manifestLoadingTimeOut: 2000,      // 2s timeout for manifest
        // Adaptive bitrate switching
        abrEwmaDefaultEstimate: 500000,   // Initial bandwidth estimate (500kbps)
        abrBandWidthFactor: 0.95,          // Conservative bandwidth factor
        abrBandWidthUpFactor: 0.7,        // More conservative when upgrading
        abrMaxWithRealBitrate: false,     // Don't limit based on real bitrate
        // CORS configuration for Azure Front Door
        xhrSetup: (xhr, url) => {
          // Configure XHR for Azure Front Door to avoid CORS issues
          if (url.includes('azurefd.net')) {
            xhr.withCredentials = false
            // Set headers that Azure Front Door expects
            // Don't add custom headers that would trigger preflight
            // HLS.js will add Range header automatically for segments
          }
        },
        // Ensure proper CORS handling
        cors: true,
      })

      hlsRef.current = hls

      // Load the manifest
      hls.loadSource(hlsSrc)
      hls.attachMedia(video)

      // Handle HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        initializingRef.current = false
        setIsLoading(false)
        setError(null)
        // Clear failed flag on success
        hlsFailedForSrcRef.current = null
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
              
              // Log detailed error information for debugging
              console.error('HLS Network Error Details:', {
                type: data.type,
                details: data.details,
                fatal: data.fatal,
                url: data.url || hlsSrc,
                response: data.response ? {
                  code: data.response.code,
                  text: data.response.text?.substring(0, 200), // First 200 chars
                  url: data.response.url,
                  headers: data.response.headers
                } : null,
                error: data.error
              })
              
              // For any fatal network error with 403/404, immediately fallback to MP4
              const isNotFound = data.details === 'manifestLoadError' || 
                                data.response?.code === 403 || 
                                data.response?.code === 404 ||
                                (data.response && (data.response.code === 403 || data.response.code === 404))
              
              if (isNotFound && hlsUrl && src && !src.includes('.m3u8')) {
                const isCorsIssue = data.response?.code === 403 && hlsUrl.includes('azurefd.net')
                console.warn(
                  isCorsIssue 
                    ? 'HLS URL returns 403 - This is likely a CORS issue. Azure Front Door needs CORS headers for XHR requests. Falling back to MP4.'
                    : 'HLS not available (403/404), falling back to MP4',
                  {
                    hlsUrl,
                    mp4Url: src,
                    errorDetails: data.details,
                    responseCode: data.response?.code,
                    responseText: data.response?.text?.substring(0, 200),
                    isCorsIssue
                  }
                )
                
                // Mark this source as failed so we don't try HLS again
                hlsFailedForSrcRef.current = src
                
                // Immediately stop all HLS operations to prevent retry loops
                try {
                  hls.stopLoad() // Stop loading immediately
                  hls.detachMedia() // Detach from video
                  hls.destroy() // Destroy instance
                } catch (e) {
                  console.warn('Error destroying HLS:', e)
                }
                hlsRef.current = null
                
                setIsHLS(false)
                setIsLoading(false)
                
                // Set MP4 source directly - don't wait
                video.src = src
                video.load()
                return
              }
              
              // For other fatal network errors, also fallback immediately (don't retry)
              if (data.fatal && hlsUrl && src && !src.includes('.m3u8')) {
                console.error('HLS fatal network error, falling back to MP4:', data.details)
                hlsFailedForSrcRef.current = src
                
                try {
                  hls.stopLoad()
                  hls.detachMedia()
                  hls.destroy()
                } catch (e) {
                  console.warn('Error destroying HLS:', e)
                }
                hlsRef.current = null
                
                setIsHLS(false)
                setIsLoading(false)
                video.src = src
                video.load()
                return
              }
              
              // If we get here, it's a fatal error but we can't fallback
              // Set error state and let user know
              const error = new Error(errorMessage)
              setError(error)
              onError?.(error)
              break
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              errorMessage = 'Media error while playing HLS stream'
              // Try to recover once
              try {
                hls.recoverMediaError()
              } catch (e) {
                const error = new Error(errorMessage)
                setError(error)
                onError?.(error)
              }
              break
              
            default:
              errorMessage = 'Unknown HLS error'
              const unknownError = new Error(errorMessage)
              setError(unknownError)
              onError?.(unknownError)
              break
          }
        }
      })

      // Cleanup function
      return () => {
        if (hls) {
          try {
            hls.stopLoad()
            hls.detachMedia()
            hls.destroy()
          } catch (e) {
            console.warn('Error cleaning up HLS:', e)
          }
          hlsRef.current = null
        }
        // Reset initialization flags on cleanup
        initializingRef.current = false
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
        try {
          hlsRef.current.stopLoad()
          hlsRef.current.detachMedia()
          hlsRef.current.destroy()
        } catch (e) {
          console.warn('Error cleaning up HLS on unmount:', e)
        }
        hlsRef.current = null
      }
      // Reset all refs on unmount
      currentSrcRef.current = null
      initializingRef.current = false
      hlsFailedForSrcRef.current = null
    }
  }, [])

  return {
    isHLS,
    isLoading,
    error,
    hls: hlsRef.current,
  }
}
