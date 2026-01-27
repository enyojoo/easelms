import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query"
import { getCacheConfig, createQueryOptions, type DataType, type CacheConfig } from "../cache-config"
import { createClient } from "@/lib/supabase/client"

/**
 * Unified Cache Hook System
 * Provides consistent caching, localStorage persistence, and optimistic updates
 */

// localStorage keys for different data types
const STORAGE_KEYS = {
  purchases: 'easelms_purchases',
  enrollments: 'easelms_enrollments',
  profile: 'easelms_profile',
  courses: 'easelms_courses',
  settings: 'easelms_settings',
  progress: 'easelms_progress',
  platformUsers: 'easelms_platform_users',
  teamMembers: 'easelms_team_members',
} as const

/**
 * Enhanced useQuery with unified caching and localStorage persistence
 */
export function useAppQuery<T>(
  dataType: DataType,
  queryKey: any[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean
    select?: (data: T) => any
    onSuccess?: (data: T) => void
    onError?: (error: any) => void
  }
) {
  const config = getCacheConfig(dataType)
  const storageKey = STORAGE_KEYS[dataType as keyof typeof STORAGE_KEYS]

  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const data = await queryFn()

        // Save to localStorage for persistence (if key exists)
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(data))
          } catch (e) {
            // Ignore localStorage errors
          }
        }

        return data
      } catch (error) {
        // On API error, try to return cached localStorage data
        if (storageKey) {
          try {
            const cached = localStorage.getItem(storageKey)
            if (cached) {
              console.log(`Using cached ${dataType} data due to API error`)
              return JSON.parse(cached)
            }
          } catch (e) {
            // Ignore localStorage errors
          }
        }
        throw error
      }
    },
    ...config,
    enabled: options?.enabled ?? true,
    select: options?.select,
    ...options,
    placeholderData: (previousData) => {
      // Try localStorage first if no previous data
      if (!previousData && storageKey) {
        try {
          const cached = localStorage.getItem(storageKey)
          return cached ? JSON.parse(cached) : undefined
        } catch (e) {
          return undefined
        }
      }
      return previousData
    },
  })
}

/**
 * Enhanced useMutation with optimistic updates
 */
export function useAppMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: Error, variables: TVariables, context?: any) => void
    invalidateQueries?: any[][]
    optimisticUpdate?: {
      queryKey: any[]
      updater: (oldData: any, variables: TVariables) => any
    }
  }
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: options?.optimisticUpdate?.queryKey })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(options?.optimisticUpdate?.queryKey)

      // Optimistically update to the new value
      if (options?.optimisticUpdate) {
        queryClient.setQueryData(
          options.optimisticUpdate.queryKey,
          (oldData: any) => options.optimisticUpdate!.updater(oldData, variables)
        )
      }

      // Return a context object with the snapshotted value
      return { previousData }
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData && options?.optimisticUpdate) {
        queryClient.setQueryData(options.optimisticUpdate.queryKey, context.previousData)
      }

      // Call the error callback if provided
      options?.onError?.(error, variables, context)
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }

      // Call the success callback if provided
      options?.onSuccess?.(data, variables)
    },
  })
}

/**
 * Hook to check if any data exists (for skeleton logic)
 */
export function useHasData(types: DataType[]): boolean {
  const queryClient = useQueryClient()

  return types.some(type => {
    // Check for actual query keys used in the app based on data type
    let possibleKeys: any[][] = []

    switch (type) {
      case 'courses':
        possibleKeys = [["courses"], ["courses", undefined], ["courses", {}]]
        break
      case 'enrollments':
        possibleKeys = [["enrollments"]]
        break
      case 'purchases':
        possibleKeys = [["purchases"], ["purchases", undefined], ["purchases", {}]]
        break
      case 'progress':
        possibleKeys = [["progress"], ["progress", "all"]]
        break
      case 'profile':
        possibleKeys = [["profile"]]
        break
      case 'settings':
        possibleKeys = [["settings"]]
        break
      case 'adminStats':
        possibleKeys = [["admin-stats"]]
        break
      case 'adminLearners':
        possibleKeys = [["learners"], ["learners", undefined], ["learners", {}]]
        break
      case 'adminCourses':
        possibleKeys = [["courses"], ["courses", undefined], ["courses", {}]]
        break
      case 'adminPurchases':
        possibleKeys = [["purchases"], ["purchases", undefined], ["purchases", {}]]
        break
      default:
        possibleKeys = [[type]]
    }

    return possibleKeys.some(key => {
      const data = queryClient.getQueryData(key)
      return !!data
    })
  })
}

/**
 * Hook to prefetch data for likely next routes
 */
export function useRoutePrefetch(routes: { path: string; dataTypes: DataType[] }[]) {
  const queryClient = useQueryClient()

  const prefetchRoute = (path: string, dataTypes: DataType[]) => {
    dataTypes.forEach(dataType => {
      // This would need to be implemented per route
      // For now, just invalidate to ensure fresh data when navigating
      queryClient.invalidateQueries({ queryKey: [dataType], refetchType: 'none' })
    })
  }

  return { prefetchRoute }
}

/**
 * Clear all cached data (useful for logout)
 */
export function clearAllCache() {
  const queryClient = useQueryClient()

  // Clear React Query cache
  queryClient.clear()

  // Clear localStorage
  Object.values(STORAGE_KEYS).forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      // Ignore errors
    }
  })
}

/**
 * Get cache stats for debugging
 */
export function useCacheStats() {
  const queryClient = useQueryClient()

  return {
    queryCache: queryClient.getQueryCache().getAll().length,
    mutationCache: queryClient.getMutationCache().getAll().length,
  }
}