import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { DataType } from "../cache-config"

/**
 * Route-based prefetching system
 * Pre-loads data for likely next navigation routes
 */

interface RouteConfig {
  path: string
  dataTypes: DataType[]
  priority?: 'high' | 'medium' | 'low'
}

const ROUTE_PREFETCH_CONFIG: RouteConfig[] = [
  // High priority - immediate navigation
  {
    path: '/learner/courses',
    dataTypes: ['courses', 'enrollments'],
    priority: 'high'
  },
  {
    path: '/learner/dashboard',
    dataTypes: ['courses', 'enrollments', 'progress'],
    priority: 'high'
  },
  {
    path: '/learner/purchase',
    dataTypes: ['purchases', 'enrollments'],
    priority: 'high'
  },

  // Medium priority - common navigation
  {
    path: '/learner/profile',
    dataTypes: ['profile'],
    priority: 'medium'
  },

  // Admin routes
  {
    path: '/admin/dashboard',
    dataTypes: ['adminStats'],
    priority: 'high'
  },
  {
    path: '/admin/courses',
    dataTypes: ['adminCourses'],
    priority: 'medium'
  },
  {
    path: '/admin/learners',
    dataTypes: ['adminLearners'],
    priority: 'medium'
  },
  {
    path: '/admin/purchases',
    dataTypes: ['adminPurchases'],
    priority: 'medium'
  },
]

/**
 * Hook to prefetch data for likely navigation routes
 * Call this on app initialization or when user context changes
 */
export function useRoutePrefetch(currentPath?: string) {
  const queryClient = useQueryClient()

  const prefetchRoute = async (routeConfig: RouteConfig) => {
    try {
      // Get the data fetching functions for each data type
      const prefetchPromises = routeConfig.dataTypes.map(async (dataType) => {
        // Only prefetch if not already cached
        const queryKey = [dataType]
        const existingData = queryClient.getQueryData(queryKey)

        if (!existingData) {
          // Start prefetching in background
          await queryClient.prefetchQuery({
            queryKey,
            // This would need to be implemented per data type
            // For now, we'll rely on the hooks themselves to fetch when needed
            staleTime: Infinity, // Don't refetch if we prefetch
          })
        }
      })

      await Promise.all(prefetchPromises)
    } catch (error) {
      console.warn(`Failed to prefetch route ${routeConfig.path}:`, error)
    }
  }

  const prefetchAllRoutes = async (priority?: 'high' | 'medium' | 'low') => {
    const routesToPrefetch = priority
      ? ROUTE_PREFETCH_CONFIG.filter(route => route.priority === priority)
      : ROUTE_PREFETCH_CONFIG

    const prefetchPromises = routesToPrefetch.map(route => prefetchRoute(route))
    await Promise.all(prefetchPromises)
  }

  const prefetchCurrentContext = async (path: string) => {
    // Find routes that are likely to be visited from current path
    const contextRoutes = ROUTE_PREFETCH_CONFIG.filter(route =>
      route.path !== path && route.priority === 'high'
    )

    const prefetchPromises = contextRoutes.map(route => prefetchRoute(route))
    await Promise.all(prefetchPromises)
  }

  useEffect(() => {
    if (currentPath) {
      // Prefetch high-priority routes when user navigates
      prefetchCurrentContext(currentPath)
    }
  }, [currentPath])

  return {
    prefetchRoute,
    prefetchAllRoutes,
    prefetchCurrentContext,
  }
}

/**
 * Hook to prefetch data on user authentication
 * Call this when user logs in
 */
export function useAuthPrefetch() {
  const { prefetchAllRoutes } = useRoutePrefetch()

  const prefetchOnAuth = async () => {
    // Prefetch high-priority routes when user authenticates
    await prefetchAllRoutes('high')
  }

  return { prefetchOnAuth }
}

/**
 * Hook to prefetch data before navigation
 * Use this with Link components for hover prefetching
 */
export function useHoverPrefetch(routePath: string) {
  const queryClient = useQueryClient()

  const prefetchOnHover = () => {
    const routeConfig = ROUTE_PREFETCH_CONFIG.find(route => route.path === routePath)
    if (routeConfig) {
      routeConfig.dataTypes.forEach(dataType => {
        queryClient.prefetchQuery({
          queryKey: [dataType],
          staleTime: Infinity, // Don't refetch if we prefetch
        })
      })
    }
  }

  return { prefetchOnHover }
}