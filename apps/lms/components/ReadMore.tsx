"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface ReadMoreProps {
  text: string
  maxLength?: number
  className?: string
}

export default function ReadMore({ text, maxLength = 350, className }: ReadMoreProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Handle empty or very short text
  if (!text || text.trim().length === 0) {
    return null
  }

  // If text is shorter than maxLength, no need for expand/collapse
  if (text.length <= maxLength) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{text}</p>
  }

  const truncatedText = text.slice(0, maxLength).trim()
  const displayText = isExpanded ? text : truncatedText
  const hasMore = text.length > maxLength

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      <p>
        {displayText}
        {!isExpanded && hasMore && "..."}
      </p>
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-primary hover:underline text-sm font-medium"
          type="button"
        >
          {isExpanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  )
}
