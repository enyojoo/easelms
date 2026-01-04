"use client"

import { useState, useEffect } from "react"

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
  useBlurPlaceholder,
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src || placeholder || "")
  const [hasError, setHasError] = useState(false)

  // Update src when prop changes
  useEffect(() => {
    const isValidSrc = src && src.trim() !== "" && !src.startsWith("data:")
    
    if (isValidSrc) {
      setImgSrc(src)
      setHasError(false)
    } else if (placeholder) {
      setImgSrc(placeholder)
      setHasError(false)
    }
  }, [src, placeholder])

  const handleError = () => {
    if (!hasError && placeholder && imgSrc !== placeholder) {
      setHasError(true)
      setImgSrc(placeholder)
    }
  }

  // Use regular img tag for better error handling
  // When fill is true, parent must have position: relative
  if (fill) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        onError={handleError}
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
        }}
      />
    )
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      loading={priority ? "eager" : "lazy"}
    />
  )
}

