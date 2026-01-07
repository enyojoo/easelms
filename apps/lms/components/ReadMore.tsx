"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ReadMoreProps {
  text: string
  maxLength?: number
  className?: string
  buttonClassName?: string
  buttonVariant?: "link" | "ghost" | "outline" | "default" | "destructive" | "secondary"
  showLessText?: string
  showMoreText?: string
}

export default function ReadMore({
  text,
  maxLength = 350,
  className,
  buttonClassName,
  buttonVariant = "link",
  showLessText = "Read Less",
  showMoreText = "Read More",
}: ReadMoreProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldShowButton, setShouldShowButton] = useState(false)

  useEffect(() => {
    // Only show button if text exceeds maxLength
    setShouldShowButton(text.length > maxLength)
  }, [text, maxLength])

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const displayText = isExpanded ? text : text.slice(0, maxLength)
  const isTruncated = !isExpanded && shouldShowButton

  // Debug logging
  console.log("ReadMore Debug:", {
    textLength: text.length,
    maxLength,
    shouldShowButton,
    isExpanded,
    isTruncated,
    displayTextLength: displayText.length
  })

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <p className={cn(
          "text-sm md:text-base text-muted-foreground leading-relaxed",
          isTruncated && "after:content-['...']"
        )}>
          {displayText}
        </p>
      </div>
      
      {shouldShowButton && (
        <Button
          variant={buttonVariant}
          size="sm"
          onClick={toggleExpanded}
          className={cn(
            "p-0 h-auto font-medium text-primary hover:text-primary/80 transition-colors",
            buttonClassName
          )}
          aria-expanded={isExpanded}
          aria-controls="bio-content"
        >
          {isExpanded ? showLessText : showMoreText}
        </Button>
      )}
    </div>
  )
}