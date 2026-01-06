"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import VideoPlayer from "./VideoPlayer"

interface MixedLessonContentProps {
  currentLesson: any
  currentLessonIndex: number
  id: string
  activeTab: string
  onComplete: () => void
  textViewed: { [key: number]: boolean }
  setTextViewed: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>
  textViewedRefs: React.MutableRefObject<{ [key: number]: { viewed: boolean; scrollTop: number; scrollHeight: number } }>
}

export default function MixedLessonContent({
  currentLesson,
  currentLessonIndex,
  id,
  activeTab,
  onComplete,
  textViewed,
  setTextViewed,
  textViewedRefs,
}: MixedLessonContentProps) {
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
        
        // Mark as viewed when user scrolls 80% of the content (video + text)
        if (scrollPercentage >= 0.8 && !textViewedRefs.current[currentLessonIndex]?.viewed) {
          textViewedRefs.current[currentLessonIndex] = {
            viewed: true,
            scrollTop,
            scrollHeight
          }
          setTextViewed((prev) => ({ ...prev, [currentLessonIndex]: true }))
          
          // If video is already completed, try to complete the lesson again
          // This handles the case where video finished first, then user scrolls text
          // Only call if text wasn't viewed before (to avoid infinite loop)
          if (!textViewed[currentLessonIndex]) {
            onComplete()
          }
        }
      }

      viewport.addEventListener('scroll', handleScroll, { passive: true })
      
      // Store cleanup function for this effect
      return () => {
        viewport.removeEventListener('scroll', handleScroll)
      }
    }, 100)

    // Cleanup timeout if component unmounts before timeout fires
    return () => {
      clearTimeout(timeoutId)
    }
  }, [currentLessonIndex, textViewedRefs, setTextViewed, textViewed, onComplete])

  return (
    <div ref={scrollAreaRef} className="w-full h-full flex-1 min-h-0">
      <ScrollArea className="w-full h-full flex-1 min-h-0">
      <div className="space-y-0">
        {/* Video Section */}
        <div className="relative w-full bg-black flex items-center justify-center flex-shrink-0" style={{ aspectRatio: '16/9' }}>
          <VideoPlayer
            key={`lesson-${currentLesson.id}-${currentLessonIndex}`}
            lessonTitle={currentLesson.title}
            onComplete={onComplete}
            autoPlay={true}
            isActive={activeTab === "video"}
            videoUrl={currentLesson.url}
            courseId={id}
            lessonId={currentLesson.id?.toString() || "lesson-" + String(currentLessonIndex)}
          />
        </div>
        {/* Text Section */}
        <div className="p-3 sm:p-4 md:p-6">
          <div 
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: currentLesson.html || currentLesson.text
            }}
          />
        </div>
      </div>
      </ScrollArea>
    </div>
  )
}
