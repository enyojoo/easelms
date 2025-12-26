"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

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
  placeholder = "/placeholder.svg?height=200&width=300",
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src || placeholder)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Update src when prop changes
  useEffect(() => {
    // Check if src is valid (not empty, not just whitespace, and not already placeholder)
    const isValidSrc = src && src.trim() !== "" && src !== placeholder && !src.startsWith("data:")
    
    if (isValidSrc) {
      setImgSrc(src)
      setHasError(false)
      setIsLoading(true)
    } else {
      setImgSrc(placeholder)
      setHasError(false)
      setIsLoading(false)
    }
  }, [src, placeholder])

  const handleError = () => {
    if (!hasError && imgSrc !== placeholder) {
      setHasError(true)
      setImgSrc(placeholder)
      setIsLoading(false)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  // Use regular img tag for better error handling
  // When fill is true, parent must have position: relative
  if (fill) {
    return (
      <>
        <img
          src={imgSrc}
          alt={alt}
          className={className}
          onError={handleError}
          onLoad={handleLoad}
          style={{
            objectFit: className?.includes("object-contain") ? "contain" : "cover",
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse z-[-1]" />
        )}
      </>
    )
  }

  return (
    <div className="relative inline-block" style={{ width, height }}>
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  )
}

