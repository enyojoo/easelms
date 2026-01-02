"use client"

import { useState, useEffect } from "react"
import { getBlurredPlaceholder, decodeBlurhash } from "@/lib/image-placeholder"

interface SafeImageProps {
  src: string
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  priority?: boolean
  sizes?: string
  placeholder?: string
  blurhash?: string
  useBlurPlaceholder?: boolean
}

export default function SafeImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  priority,
  sizes,
  placeholder,
  blurhash,
  useBlurPlaceholder = true,
}: SafeImageProps) {
  // Use blurred placeholder by default, or custom placeholder if provided
  const defaultPlaceholder = useBlurPlaceholder 
    ? getBlurredPlaceholder(width || 400, height || 300)
    : placeholder || getBlurredPlaceholder(width || 400, height || 300)
  
  const [imgSrc, setImgSrc] = useState(src || defaultPlaceholder)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [blurPlaceholder, setBlurPlaceholder] = useState<string | null>(null)

  // Generate blurhash placeholder if provided
  useEffect(() => {
    if (blurhash && typeof window !== 'undefined') {
      try {
        const decoded = decodeBlurhash(blurhash, width || 32, height || 32)
        setBlurPlaceholder(decoded)
      } catch (error) {
        console.warn('Failed to decode blurhash:', error)
        setBlurPlaceholder(null)
      }
    } else {
      setBlurPlaceholder(null)
    }
  }, [blurhash, width, height])

  // Check if image is already cached in browser
  const checkImageCache = (imageSrc: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!imageSrc || imageSrc.startsWith("data:") || imageSrc === defaultPlaceholder) {
        resolve(false)
        return
      }

      // Create a new Image object to check cache
      const img = new Image()
      
      // Set up timeout to check if image loads quickly (cached)
      const timeout = setTimeout(() => {
        if (img.complete && img.naturalWidth > 0) {
          resolve(true)
        } else {
          resolve(false)
        }
      }, 50)
      
      // If image loads, clear timeout and resolve
      img.onload = () => {
        clearTimeout(timeout)
        // If image loaded very quickly, it's likely cached
        resolve(true)
      }
      
      img.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }
      
      // Set src to trigger load check
      img.src = imageSrc
      
      // If image is already complete (cached), resolve immediately
      if (img.complete && img.naturalWidth > 0) {
        clearTimeout(timeout)
        resolve(true)
        return
      }
    })
  }

  // Update src when prop changes
  useEffect(() => {
    // Check if src is valid (not empty, not just whitespace, and not already placeholder)
    const isValidSrc = src && src.trim() !== "" && src !== defaultPlaceholder && !src.startsWith("data:")
    
    if (isValidSrc) {
      setImgSrc(src)
      setHasError(false)
      
      // Check if image is cached before showing loading state
      checkImageCache(src).then((isCached) => {
        if (isCached) {
          // Image is cached, skip loading state
          setIsLoading(false)
        } else {
          // Image not cached, show loading state
          setIsLoading(true)
        }
      })
    } else {
      setImgSrc(defaultPlaceholder)
      setHasError(false)
      setIsLoading(false)
    }
  }, [src, defaultPlaceholder])

  const handleError = () => {
    if (!hasError && imgSrc !== defaultPlaceholder) {
      setHasError(true)
      setImgSrc(defaultPlaceholder)
      setIsLoading(false)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  // Determine which placeholder to show while loading
  const showPlaceholder = blurPlaceholder || (isLoading && useBlurPlaceholder ? getBlurredPlaceholder(width || 400, height || 300) : null)

  // Use regular img tag for better error handling
  // When fill is true, parent must have position: relative
  if (fill) {
    return (
      <>
        {showPlaceholder && isLoading && (
          <img
            src={showPlaceholder}
            alt=""
            aria-hidden="true"
            className={`${className || ''} absolute inset-0 object-cover`}
            style={{
              filter: 'blur(20px)',
              transform: 'scale(1.1)',
              width: "100%",
              height: "100%",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
        <img
          src={imgSrc}
          alt={alt}
          className={className}
          onError={handleError}
          onLoad={handleLoad}
          loading={priority ? "eager" : "lazy"}
          style={{
            objectFit: className?.includes("object-contain") ? "contain" : "cover",
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transition: isLoading ? 'opacity 0.2s ease-in-out' : 'none',
            opacity: isLoading ? 0 : 1,
          }}
        />
        {isLoading && !showPlaceholder && (
          <div className="absolute inset-0 bg-muted/50 animate-pulse z-[-1]" />
        )}
      </>
    )
  }

  return (
    <div className="relative inline-block" style={{ width, height }}>
      {showPlaceholder && isLoading && (
        <img
          src={showPlaceholder}
          alt=""
          aria-hidden="true"
          className={`${className || ''} absolute inset-0 object-cover`}
          style={{
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      )}
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        loading={priority ? "eager" : "lazy"}
        style={{
          transition: isLoading ? 'opacity 0.2s ease-in-out' : 'none',
          opacity: isLoading ? 0 : 1,
        }}
      />
      {isLoading && !showPlaceholder && (
        <div className="absolute inset-0 bg-muted/50 animate-pulse" />
      )}
    </div>
  )
}

