/**
 * Prefetch Provider Component
 * Integrates intelligent prefetching into the app
 */

"use client"

import { useEffect } from "react"
import { useRoutePrefetching } from "./route-prefetcher"

interface PrefetchProviderProps {
  children: React.ReactNode
}

export function PrefetchProvider({ children }: PrefetchProviderProps) {
  // Initialize route prefetching
  useRoutePrefetching()

  // Set up global prefetching on app start
  useEffect(() => {
    // Prefetch critical data when app loads
    const prefetchCriticalData = async () => {
      // This will be handled by the route prefetcher when routes change
      // But we can add any global initialization here if needed
    }

    prefetchCriticalData()
  }, [])

  return <>{children}</>
}

// Hook for components to trigger predictive prefetching
export function usePredictivePrefetch() {
  const { handleUserAction } = useRoutePrefetching()

  return {
    // Trigger prefetching based on user actions
    onEnroll: () => handleUserAction('enrollment'),
    onLessonComplete: () => handleUserAction('lesson-complete'),
    onBrowseCourses: () => handleUserAction('course-browse'),
    onPurchase: () => handleUserAction('purchase')
  }
}