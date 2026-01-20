/**
 * Intelligent Route-Based Prefetching
 * Anticipates user navigation and preloads data for instant experiences
 */

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useCallback } from "react"
import { getPrefetchManager } from "@/lib/cache/react-query-integration"
import { getCacheManager } from "@/lib/cache/cache-manager"

// Route-based prefetching strategies
const ROUTE_PREFETCH_MAP = {
  '/learner/dashboard': {
    immediate: ['enrollments', 'progress', 'profile'],
    hover: ['courses'],
    intersection: ['recommended-courses']
  },
  '/learner/courses': {
    immediate: ['courses', 'enrollments'],
    hover: ['course-details'],
    intersection: ['course-progress']
  },
  '/learner/purchase': {
    immediate: ['purchases', 'enrollments'],
    hover: [],
    intersection: []
  },
  '/learner/profile': {
    immediate: ['profile', 'certificates'],
    hover: [],
    intersection: []
  }
} as const

// User behavior patterns for predictive prefetching
const USER_PATTERNS = {
  // After enrolling in a course, likely to visit it
  'enrollment': ['course-details', 'course-progress'],
  // After completing a lesson, likely to continue
  'lesson-complete': ['next-lesson', 'course-progress'],
  // After browsing courses, likely to check dashboard
  'course-browse': ['dashboard', 'enrollments'],
  // After purchasing, likely to start learning
  'purchase': ['enrollments', 'course-details']
} as const

class RoutePrefetcher {
  private currentRoute = ''
  private prefetchManager = getPrefetchManager()
  private cacheManager = getCacheManager()
  private prefetchedRoutes = new Set<string>()
  private intersectionObserver: IntersectionObserver | null = null

  constructor() {
    this.setupIntersectionObserver()
  }

  private setupIntersectionObserver() {
    if (typeof window === 'undefined') return

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const route = entry.target.getAttribute('data-prefetch-route')
            if (route) {
              this.prefetchRouteData(route, 'intersection')
            }
          }
        })
      },
      { rootMargin: '50px' } // Start prefetching when element is 50px from viewport
    )
  }

  // Prefetch data for a specific route
  async prefetchRoute(route: string, priority: 'immediate' | 'hover' | 'intersection' = 'immediate') {
    if (this.prefetchedRoutes.has(`${route}-${priority}`)) return

    const prefetchConfig = ROUTE_PREFETCH_MAP[route as keyof typeof ROUTE_PREFETCH_MAP]
    if (!prefetchConfig) return

    const dataToPrefetch = prefetchConfig[priority]
    if (!dataToPrefetch?.length) return

    // Mark as prefetched to avoid duplicate work
    this.prefetchedRoutes.add(`${route}-${priority}`)

    // Prefetch each data type
    for (const dataType of dataToPrefetch) {
      await this.prefetchDataType(dataType, priority === 'immediate')
    }
  }

  private async prefetchDataType(dataType: string, immediate = false) {
    try {
      switch (dataType) {
        case 'enrollments':
          // Check if we already have fresh data
          const enrollmentsCache = await this.cacheManager.get('enrollments')
          if (!enrollmentsCache || this.isStale(enrollmentsCache.timestamp)) {
            if (immediate) {
              this.prefetchManager.prefetchNow('enrollments')
            } else {
              this.prefetchManager.queue('enrollments')
            }
          }
          break

        case 'courses':
          const coursesCache = await this.cacheManager.get('courses')
          if (!coursesCache || this.isStale(coursesCache.timestamp)) {
            if (immediate) {
              this.prefetchManager.prefetchNow('courses')
            } else {
              this.prefetchManager.queue('courses')
            }
          }
          break

        case 'profile':
          const profileCache = await this.cacheManager.get('profile')
          if (!profileCache || this.isStale(profileCache.timestamp)) {
            if (immediate) {
              this.prefetchManager.prefetchNow('profile')
            } else {
              this.prefetchManager.queue('profile')
            }
          }
          break

        case 'purchases':
          const purchasesCache = await this.cacheManager.get('purchases')
          if (!purchasesCache || this.isStale(purchasesCache.timestamp)) {
            if (immediate) {
              this.prefetchManager.prefetchNow('purchases')
            } else {
              this.prefetchManager.queue('purchases')
            }
          }
          break

        case 'progress':
          const progressCache = await this.cacheManager.get('progress')
          if (!progressCache || this.isStale(progressCache.timestamp)) {
            if (immediate) {
              this.prefetchManager.prefetchNow('progress')
            } else {
              this.prefetchManager.queue('progress')
            }
          }
          break

        default:
          console.log(`Unknown data type for prefetching: ${dataType}`)
      }
    } catch (error) {
      console.warn(`Failed to prefetch ${dataType}:`, error)
    }
  }

  private isStale(timestamp: number, maxAge = 5 * 60 * 1000): boolean {
    return Date.now() - timestamp > maxAge
  }

  // Handle user behavior patterns
  async handleUserAction(action: keyof typeof USER_PATTERNS) {
    const patterns = USER_PATTERNS[action]
    if (!patterns) return

    // Prefetch data based on user behavior
    for (const dataType of patterns) {
      await this.prefetchDataType(dataType, false) // Queue for background prefetching
    }
  }

  // Set up route change monitoring
  onRouteChange(newRoute: string) {
    // Clear previous route prefetched status for hover/intersection
    this.prefetchedRoutes.forEach(key => {
      if (key.includes('-hover') || key.includes('-intersection')) {
        this.prefetchedRoutes.delete(key)
      }
    })

    // Prefetch data for the new route
    this.prefetchRoute(newRoute, 'immediate')

    this.currentRoute = newRoute
  }

  // Register elements for intersection-based prefetching
  registerIntersectionElement(element: Element, route: string) {
    if (this.intersectionObserver) {
      element.setAttribute('data-prefetch-route', route)
      this.intersectionObserver.observe(element)
    }
  }

  // Set up hover-based prefetching for links
  setupHoverPrefetching() {
    if (typeof window === 'undefined') return

    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a')

      if (link && link.hasAttribute('data-prefetch-route')) {
        const route = link.getAttribute('data-prefetch-route')!
        this.prefetchRoute(route, 'hover')
      }
    }, { passive: true })
  }

  // Clean up resources
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
      this.intersectionObserver = null
    }
    this.prefetchedRoutes.clear()
  }
}

// Singleton instance
let routePrefetcherInstance: RoutePrefetcher | null = null

export function getRoutePrefetcher(): RoutePrefetcher {
  if (!routePrefetcherInstance) {
    routePrefetcherInstance = new RoutePrefetcher()
  }
  return routePrefetcherInstance
}

// React hook for using route prefetching
export function useRoutePrefetching() {
  const router = useRouter()
  const pathname = usePathname()
  const prefetcher = getRoutePrefetcher()

  // Handle route changes
  useEffect(() => {
    prefetcher.onRouteChange(pathname)
  }, [pathname, prefetcher])

  // Set up hover prefetching
  useEffect(() => {
    prefetcher.setupHoverPrefetching()
  }, [prefetcher])

  // Handle user actions for predictive prefetching
  const handleUserAction = useCallback((action: keyof typeof USER_PATTERNS) => {
    prefetcher.handleUserAction(action)
  }, [prefetcher])

  // Register elements for intersection prefetching
  const registerForPrefetching = useCallback((element: Element | null, route: string) => {
    if (element) {
      prefetcher.registerIntersectionElement(element, route)
    }
  }, [prefetcher])

  return {
    handleUserAction,
    registerForPrefetching
  }
}

// Utility for adding prefetch attributes to links
export function prefetchLinkAttributes(route: string) {
  return {
    'data-prefetch-route': route,
    onMouseEnter: () => getRoutePrefetcher().prefetchRoute(route, 'hover')
  }
}