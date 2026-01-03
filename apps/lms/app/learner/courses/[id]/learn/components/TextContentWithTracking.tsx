"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TextContentWithTrackingProps {
  content: string
  lessonIndex: number
  onTextViewed: () => void
  textViewedRefs: React.MutableRefObject<{ [key: number]: { viewed: boolean; scrollTop: number; scrollHeight: number } }>
  textViewed: { [key: number]: boolean }
}

export default function TextContentWithTracking({
  content,
  lessonIndex,
  onTextViewed,
  textViewedRefs,
  textViewed,
}: TextContentWithTrackingProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Set up scroll tracking for text viewing
  useEffect(() => {
    // Use a timeout to ensure ScrollArea's viewport is rendered
    const timeoutId = setTimeout(() => {
      const scrollArea = scrollAreaRef.current
      if (!scrollArea) return

      // Find the viewport element inside ScrollArea (Radix UI creates it)
      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      if (!viewport) return

      const handleScroll = () => {
        const scrollTop = viewport.scrollTop
        const scrollHeight = viewport.scrollHeight
        const clientHeight = viewport.clientHeight
        const scrollPercentage = scrollHeight > 0 ? (scrollTop + clientHeight) / scrollHeight : 0
        
        // Mark as viewed when user scrolls 80% of the content
        if (scrollPercentage >= 0.8 && !textViewedRefs.current[lessonIndex]?.viewed) {
          textViewedRefs.current[lessonIndex] = {
            viewed: true,
            scrollTop,
            scrollHeight
          }
          
          // Only call onTextViewed if text wasn't viewed before (to avoid infinite loop)
          if (!textViewed[lessonIndex]) {
            onTextViewed()
          }
        }
      }

      viewport.addEventListener('scroll', handleScroll, { passive: true })
      
      return () => {
        viewport.removeEventListener('scroll', handleScroll)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [lessonIndex, textViewedRefs, textViewed, onTextViewed])

  return (
    <div ref={scrollAreaRef} className="w-full h-full flex-1 min-h-0">
      <ScrollArea className="w-full h-full flex-1 min-h-0">
        <div className="p-3 sm:p-4 md:p-6">
          <div 
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: content
            }}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
