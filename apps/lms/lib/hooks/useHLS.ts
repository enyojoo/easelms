import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

interface UseHLSOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  src: string | null | undefined
  onError?: (error: Error) => void
  /** Set to true once the video element is in the DOM (e.g. after modal open). Omit or true for normal mounts. */
  videoReady?: boolean
  /** If true, start playback when ready. If false, never call video.play() from this hook. Default false. */
  autoplay?: boolean
}

/**
 * Hook to handle HLS playback with YouTube-like buffering
 * Automatically detects .m3u8 URLs and initializes HLS.js for non-Safari browsers
 * Uses native HLS for Safari
 */
export function useHLS({ videoRef, src, onError, videoReady = true, autoplay = false }: UseHLSOptions) {
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
  // Track consecutive non-fatal errors to prevent infinite retry loops
  const consecutiveErrorsRef = useRef<number>(0)
  const maxConsecutiveErrors = 5 // Stop after 5 consecutive non-fatal errors

  useEffect(() => {
    const video = videoRef.current
    if (!videoReady || !video || !src) {
      // Cleanup if src becomes null/undefined
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad()
          hlsRef.current.detachMedia()
          hlsRef.current.destroy()
        } catch (e) {
          console.warn('Error cleaning up HLS:', e)
        }
        hlsRef.current = null
      }
      currentSrcRef.current = null
      initializingRef.current = false
      return
    }

    // If source changed, cleanup old HLS instance first
    if (currentSrcRef.current !== null && currentSrcRef.current !== src) {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad()
          hlsRef.current.detachMedia()
          hlsRef.current.destroy()
        } catch (e) {
          console.warn('Error cleaning up old HLS instance:', e)
        }
        hlsRef.current = null
      }
      initializingRef.current = false
    }

    // Prevent re-initialization if already processing the same source
    if (currentSrcRef.current === src && hlsRef.current) {
      // Check if HLS instance is still valid and attached
      try {
        const hls = hlsRef.current
        // If HLS instance exists and media is attached, don't recreate
        if (hls.media === video) {
          console.log('HLS instance already exists and attached for this source, skipping:', src)
          initializingRef.current = false
          return
        }
      } catch (e) {
        // HLS instance might be destroyed, continue to create new one
        console.log('Existing HLS instance invalid, creating new one')
        hlsRef.current = null
      }
      
      // If we're already initializing, don't start again
      if (initializingRef.current) {
        console.log('HLS already initializing for this source, skipping:', src)
        return
      }
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
        initializingRef.current = false
        setIsHLS(false)
        video.src = src
        const showThumbnail = () => {
          if (video.paused) video.currentTime = 0
        }
        video.addEventListener('loadeddata', showThumbnail, { once: true })
        video.addEventListener('canplay', showThumbnail, { once: true })
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
      initializingRef.current = false
      video.src = src
      const showThumbnail = () => {
        if (video.paused) video.currentTime = 0
      }
      video.addEventListener('loadeddata', showThumbnail, { once: true })
      video.addEventListener('canplay', showThumbnail, { once: true })
      return
    }

    // Use HLS URL if we constructed one, otherwise use the original src
    const hlsSrc = hlsUrl || src

    // Detect if we're on iOS (iPhone, iPad, iPod)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    // Detect if we're on Safari (not Chrome/Firefox on macOS)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

    // Check for native HLS support first (all iOS browsers, Safari on macOS)
    const hasNativeHLS = video.canPlayType('application/vnd.apple.mpegurl')

    if (hasNativeHLS && (isIOS || isSafari)) {
      // Safari / iOS: use native HLS (plain video tag with .m3u8 URL per HLS.js docs).
      // Same HLS URLs as Chrome/Android; only fall back to MP4 on actual video error.
      const sourceToUse = hlsUrl || hlsSrc
      const canFallbackToMp4 = src && !src.includes('.m3u8')

      initializingRef.current = false
      video.src = sourceToUse
      video.load()

      const fallbackToMp4 = () => {
        if (!canFallbackToMp4) return
        hlsFailedForSrcRef.current = src
        video.src = src
        video.load()
      }

      video.addEventListener('error', () => {
        const err = video.error
        if (err && canFallbackToMp4) {
          const fatal = err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
            err.code === MediaError.MEDIA_ERR_NETWORK ||
            err.code === MediaError.MEDIA_ERR_DECODE
          if (fatal) fallbackToMp4()
        }
      }, { once: true })

      const showThumbnail = () => {
        if (video.paused) video.currentTime = 0
      }
      video.addEventListener('loadeddata', showThumbnail, { once: true })
      video.addEventListener('canplay', showThumbnail, { once: true })
      return
    }

    // For browsers with MSE support (Chrome/Firefox/Edge desktop, Android), use HLS.js
    if (Hls.isSupported()) {
      setIsLoading(true)
      
      // Clear any existing src before creating HLS instance to prevent conflicts
      // HLS.js will manage the source internally via Media Source Extensions
      if (video.src && !isHLSFile) {
        // Only clear if we're switching from MP4 to HLS
        video.removeAttribute('src')
        // Don't call load() here as it might cause issues - let HLS.js handle it
      }
      
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // Conservative buffering to prevent continuous requests
        backBufferLength: 30,              // Keep 30s behind current position (reduced)
        maxBufferLength: 20,               // Buffer 20s ahead (reduced to prevent excessive requests)
        maxMaxBufferLength: 30,            // Max 30s buffer (reduced from 120s)
        maxBufferSize: 30 * 1000 * 1000,  // 30MB buffer (reduced)
        maxBufferHole: 0.1,                // Smaller gap tolerance
        highBufferWatchdogPeriod: 2,       // Check buffer health every 2s
        nudgeOffset: 0.1,                  // Small seek adjustments
        nudgeMaxRetry: 3,                  // Retry failed segments
        maxFragLookUpTolerance: 0.25,      // Fragment lookup tolerance
        maxLoadingDelay: 4,                // Max delay before switching quality
        minAutoBitrate: 0,                 // Allow lowest quality if needed
        // Limit retries to prevent infinite loops - VERY STRICT
        manifestLoadingMaxRetry: 0,        // NO retries for manifest (fail immediately)
        levelLoadingMaxRetry: 0,           // NO retries for level (fail immediately)
        fragLoadingMaxRetry: 1,            // Only retry fragment load 1 time
        manifestLoadingRetryDelay: 0,      // No delay - fail immediately
        levelLoadingRetryDelay: 0,
        fragLoadingRetryDelay: 100,        // Very short delay for fragments
        // Stop retrying on fatal errors immediately
        fragLoadingTimeOut: 10000,         // 10s timeout for fragments
        manifestLoadingTimeOut: 10000,     // 10s timeout for manifest (increased to handle slow responses)
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
            // Don't set custom headers that would trigger preflight
            // HLS.js will add Range header automatically for segments
            console.log('XHR setup for URL:', url)
          }
        },
        // Ensure proper CORS handling
        cors: true,
      })

      hlsRef.current = hls

      console.log('Loading HLS manifest:', hlsSrc)
      console.log('Video element state before HLS attach:', {
        src: video.src,
        readyState: video.readyState,
        paused: video.paused,
        networkState: video.networkState
      })
      
      // Ensure video element has no src attribute (HLS.js uses Media Source Extensions)
      if (video.src) {
        video.removeAttribute('src')
      }
      
      // Add event listeners BEFORE loading source (so we don't miss events)
      // Add event listeners for debugging and tracking
      hls.on(Hls.Events.LEVEL_LOADING, (event, data) => {
        console.log('HLS Level loading:', data.level, data.url)
      })
      
      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log('HLS Level loaded:', data.level, data.details?.totalduration)
        // After level is loaded, fragments will load; try play after a short delay as fallback (only if autoplay)
        if (!autoplay) return
        setTimeout(() => {
          if (hlsRef.current === hls && video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            console.log('Level loaded fallback: attempting play, readyState:', video.readyState)
            setIsLoading(false)
            video.play().catch((err) => console.warn('Play after level loaded:', err.message))
          }
        }, 500)
      })
      
      hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
        console.log('HLS Fragment loading:', data.frag?.url, 'level:', data.frag?.level)
      })
      
      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        console.log('HLS Fragment loaded:', data.frag?.url, 'level:', data.frag?.level)
        consecutiveErrorsRef.current = 0 // Reset on successful load
      })
      
      hls.on(Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, (event, data) => {
        console.warn('HLS Fragment load aborted:', data.frag?.url)
      })
      
      hls.on(Hls.Events.BUFFER_APPENDING, (event, data) => {
        console.log('HLS Buffer appending:', data.type)
      })
      
      hls.on(Hls.Events.BUFFER_APPENDED, (event, data) => {
        console.log('HLS Buffer appended:', data.type)
        if (data.type === 'video') {
          setIsLoading(false)
          // Show video thumbnail (first frame): seek to 0 so user sees thumbnail instead of black
          if (video.paused) {
            video.currentTime = 0
          }
          if (autoplay && video.paused) {
            console.log('Video buffer appended, attempting play, readyState:', video.readyState)
            video.play().catch((err) => console.warn('Play after buffer append:', err.message))
          }
        }
      })
      
      // Try to start playback when first fragment is loaded (only if autoplay)
      hls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
        if (data.frag?.type === 'main') {
          setIsLoading(false)
          if (video.paused) {
            video.currentTime = 0
          }
          if (autoplay && video.paused) {
            console.log('Fragment buffered, attempting play')
            video.play().catch((err) => console.warn('Play after frag buffered:', err.message))
          }
        }
      })
      
      // Listen for manifest loading events
      hls.on(Hls.Events.MANIFEST_LOADING, () => {
        console.log('HLS Manifest loading started...')
      })
      
      hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
        console.log('HLS Manifest loaded successfully:', {
          levels: data.levels?.length,
          url: data.url,
          stats: data.stats
        })
      })
      
      // Load source only; attach media after MANIFEST_PARSED so fragment loading starts reliably
      console.log('Loading HLS source (media will attach after manifest parse)...')
      hls.loadSource(hlsSrc)

      // Handle HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('HLS Manifest parsed successfully:', data.levels?.length, 'levels')
        console.log('HLS Levels:', data.levels?.map((l: any) => ({ 
          level: l.level, 
          bitrate: l.bitrate, 
          width: l.width, 
          height: l.height,
          url: l.url 
        })))
        
        // Attach media after manifest parse so fragment loading starts reliably (hls.js workaround)
        if (!hls.media) {
          console.log('Attaching media after manifest parse')
          hls.attachMedia(video)
        }
        
        initializingRef.current = false
        setIsLoading(false)
        setError(null)
        // Clear failed flag and error counter on success
        hlsFailedForSrcRef.current = null
        consecutiveErrorsRef.current = 0
        
        // Ensure loading starts so fragments are requested
        if (hls.media === video) {
          console.log('Manifest parsed, ensuring HLS starts loading levels')
          if (hls.currentLevel === -1 && data.levels && data.levels.length > 0) {
            console.log('No level selected, starting load')
            hls.startLoad()
          }
        }
        
        // Try to start playback only when autoplay is enabled
        const startPlayback = () => {
          if (autoplay && video.paused) {
            console.log('Attempting to start HLS playback, readyState:', video.readyState)
            video.play().catch((err) => {
              console.warn('Autoplay prevented or failed:', err.message)
              // Even if autoplay fails, HLS.js should still load fragments
              // The user can click play manually
            })
          }
        }
        
        // Wait for video to have some data; show thumbnail (first frame) when not autoplaying
        const tryPlayWhenReady = () => {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.paused) {
            setIsLoading(false)
            video.currentTime = 0
            if (autoplay) {
              console.log('Video has data, starting playback, readyState:', video.readyState)
              startPlayback()
            }
          }
        }
        
        video.addEventListener('loadedmetadata', tryPlayWhenReady, { once: true })
        video.addEventListener('loadeddata', tryPlayWhenReady, { once: true })
        video.addEventListener('canplay', () => {
          console.log('Video canplay, readyState:', video.readyState)
          setIsLoading(false)
          if (autoplay) startPlayback()
        }, { once: true })
        video.addEventListener('playing', () => {
          console.log('Video playing')
          setIsLoading(false)
        }, { once: true })
        
        // Immediate try and fallback after level load (only when autoplay)
        if (autoplay) {
          tryPlayWhenReady()
          setTimeout(tryPlayWhenReady, 1000)
          setTimeout(tryPlayWhenReady, 3000)
        }
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        setIsLoading(false)
        
        // Track consecutive errors for non-fatal errors
        if (!data.fatal) {
          consecutiveErrorsRef.current += 1
          
          // If too many consecutive non-fatal errors, stop and fallback
          if (consecutiveErrorsRef.current >= maxConsecutiveErrors && hlsUrl && src && !src.includes('.m3u8')) {
            console.warn(`Too many consecutive HLS errors (${consecutiveErrorsRef.current}), falling back to MP4`)
            hlsFailedForSrcRef.current = src
            
            try {
              hls.stopLoad()
              hls.detachMedia()
              hls.destroy()
            } catch (e) {
              console.warn('Error destroying HLS after too many errors:', e)
            }
            hlsRef.current = null
            
            setIsHLS(false)
            setIsLoading(false)
            consecutiveErrorsRef.current = 0
            video.src = src
            video.load()
            return
          }
          
          // For non-fatal errors, just log and continue (HLS.js will retry)
          console.warn('HLS non-fatal error:', data.details, `(${consecutiveErrorsRef.current}/${maxConsecutiveErrors})`)
          return
        }
        
        // Reset error counter on fatal error (we'll handle it below)
        consecutiveErrorsRef.current = 0
        
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
                  text: data.response.text?.substring(0, 500), // First 500 chars
                  url: data.response.url,
                  headers: data.response.headers
                } : null,
                error: data.error,
                // Additional debugging info
                networkDetails: data.networkDetails,
                context: data.context
              })
              
              // If it's a timeout, check if the URL is accessible
              if (data.details === 'manifestLoadTimeOut') {
                console.warn('Manifest load timeout - checking if URL is accessible:', hlsSrc)
                // Try to fetch the manifest directly to see if it's accessible
                fetch(hlsSrc, { method: 'HEAD', mode: 'cors' })
                  .then(response => {
                    console.log('Direct fetch test - Status:', response.status, 'Headers:', {
                      'content-type': response.headers.get('content-type'),
                      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                      'access-control-expose-headers': response.headers.get('access-control-expose-headers')
                    })
                  })
                  .catch(err => {
                    console.error('Direct fetch test failed:', err)
                  })
              }
              
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
        console.log('Cleaning up HLS instance for source:', src)
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
        // Only reset currentSrcRef if we're actually changing sources
        // (not on re-renders with same source)
      }
    } else {
      // HLS.js not supported - fallback to direct video
      const error = new Error('HLS.js is not supported in this browser')
      setError(error)
      onError?.(error)
      if (hlsUrl && src && !src.includes('.m3u8')) {
        video.src = src
      } else if (src.includes('.m3u8')) {
        video.src = src.replace('.m3u8', '.mp4')
      } else {
        video.src = src
      }
    }
  }, [src, videoReady, autoplay]) // Re-run when video element is mounted or autoplay changes

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
      consecutiveErrorsRef.current = 0
    }
  }, [])

  return {
    isHLS,
    isLoading,
    error,
    hls: hlsRef.current,
  }
}
