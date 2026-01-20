"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface ReadMoreProps {
  text: string
  maxLength: number
  className?: string
}

export default function ReadMore({ text, maxLength, className }: ReadMoreProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (text.length <= maxLength) {
    return <p className={className}>{text}</p>
  }

  const truncatedText = text.slice(0, maxLength).trim()
  const shouldShowReadMore = text.length > maxLength

  return (
    <div className={className}>
      <p>
        {isExpanded ? text : `${truncatedText}...`}
      </p>
      {shouldShowReadMore && (
        <Button
          variant="link"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0 h-auto text-primary hover:underline"
        >
          {isExpanded ? "Read Less" : "Read More"}
        </Button>
      )}
    </div>
  )
}