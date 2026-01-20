/**
 * React Query Integration with Advanced Cache Manager
 * Provides enhanced caching, persistence, and intelligent data management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"
import { getCacheManager, CACHE_KEYS, type CacheOptions } from "./cache-manager"

interface EnhancedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  cache?: CacheOptions
  enablePersistence?: boolean
  optimistic?: boolean
}

interface EnhancedMutationOptions<TData, TVariables> extends UseMutationOptions<TData, Error, TVariables> {
  optimistic?: boolean
  rollbackOnError?: boolean
}

// Enhanced query hook with advanced caching
export function useEnhancedQuery<T>(
  key: string[],
  queryFn: () => Promise<T>,
  options: EnhancedQueryOptions<T> = {}
) {
  const {
    cache = {},
    enablePersistence = true,
    optimistic = false,
    ...queryOptions
  } = options

  const cacheManager = getCacheManager()

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        const data = await queryFn()

        // Persist to advanced cache if enabled
        if (enablePersistence) {
          const cacheKey = key.join('_')
          await cacheManager.set(cacheKey, data, {
            ttl: cache.ttl,
            version: cache.version,
            compress: cache.compress,
            priority: cache.priority
          })
        }

        return data
      } catch (error) {
        // Try to get from cache as fallback
        if (enablePersistence) {
          const cacheKey = key.join('_')
          const cachedData = await cacheManager.get<T>(cacheKey, cache.version)
          if (cachedData) {
            console.log(`Using cached data for ${cacheKey} due to error:`, error)
            return cachedData
          }
        }
        throw error
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: async (previousData) => {
      // Return previous data immediately if available
      if (previousData) return previousData

      // Try to get from cache for instant loading
      if (enablePersistence) {
        const cacheKey = key.join('_')
        const cachedData = await cacheManager.get<T>(cacheKey, cache.version)
        return cachedData || undefined
      }
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...queryOptions
  })
}

// Enhanced mutation hook with optimistic updates
export function useEnhancedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: EnhancedMutationOptions<TData, TVariables> = {}
) {
  const {
    optimistic = false,
    rollbackOnError = true,
    onMutate,
    onError,
    onSuccess,
    ...mutationOptions
  } = options

  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    ...mutationOptions,
    onMutate: async (variables) => {
      // Call original onMutate if provided
      if (onMutate) {
        await onMutate(variables)
      }

      // Handle optimistic updates
      if (optimistic) {
        // Cancel any outgoing refetches to avoid overwriting optimistic update
        await queryClient.cancelQueries()

        // Snapshot previous value for rollback
        const previousData = queryClient.getQueryData(mutationOptions.mutationKey as any)

        // Optimistically update cache
        // This would be implemented based on specific mutation type
        // For now, just return the previous data for potential rollback
        return { previousData }
      }
    },
    onError: async (error, variables, context) => {
      // Call original onError if provided
      if (onError) {
        await onError(error, variables, context)
      }

      // Rollback optimistic updates on error
      if (optimistic && rollbackOnError && context?.previousData) {
        queryClient.setQueryData(mutationOptions.mutationKey as any, context.previousData)
      }
    },
    onSuccess: async (data, variables, context) => {
      // Call original onSuccess if provided
      if (onSuccess) {
        await onSuccess(data, variables, context)
      }

      // Invalidate related queries to ensure fresh data
      if (mutationOptions.mutationKey) {
        await queryClient.invalidateQueries({
          queryKey: mutationOptions.mutationKey.slice(0, -1) // Invalidate parent queries
        })
      }
    }
  })
}

// Cache utilities
export const cacheUtils = {
  // Preload data into cache
  preload: async (key: string[], data: any, options?: CacheOptions) => {
    const cacheManager = getCacheManager()
    const cacheKey = key.join('_')
    await cacheManager.set(cacheKey, data, options)
  },

  // Get cached data without React Query
  getCached: async <T>(key: string[], version?: string): Promise<T | null> => {
    const cacheManager = getCacheManager()
    const cacheKey = key.join('_')
    return cacheManager.get<T>(cacheKey, version)
  },

  // Clear specific cache entry
  clearCache: async (key: string[]) => {
    const cacheManager = getCacheManager()
    const cacheKey = key.join('_')
    await cacheManager.delete(cacheKey)
  },

  // Clear all cache
  clearAllCache: async () => {
    const cacheManager = getCacheManager()
    await cacheManager.clear()
  },

  // Get cache statistics
  getCacheStats: async () => {
    const cacheManager = getCacheManager()
    return cacheManager.getStats()
  }
}

// Intelligent prefetching
export class PrefetchManager {
  private prefetchQueue = new Set<string>()
  private prefetching = new Set<string>()

  constructor() {
    // Start prefetching when user is idle
    if (typeof window !== 'undefined') {
      this.setupIdlePrefetch()
    }
  }

  private setupIdlePrefetch() {
    // Use requestIdleCallback for non-blocking prefetching
    const prefetchNext = () => {
      if (this.prefetchQueue.size > 0 && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          const key = this.prefetchQueue.values().next().value
          if (key && !this.prefetching.has(key)) {
            this.prefetchQueue.delete(key)
            this.prefetching.add(key)
            this.executePrefetch(key)
          }
        })
      }
    }

    // Prefetch when user is idle
    const idleTimer = setInterval(prefetchNext, 1000)

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(idleTimer)
    })
  }

  private async executePrefetch(key: string) {
    try {
      // This would be implemented based on the prefetch strategy
      // For now, just mark as prefetched
      console.log(`Prefetching: ${key}`)
      this.prefetching.delete(key)
    } catch (error) {
      console.warn(`Prefetch failed for ${key}:`, error)
      this.prefetching.delete(key)
    }
  }

  // Add to prefetch queue
  queue(key: string) {
    if (!this.prefetchQueue.has(key) && !this.prefetching.has(key)) {
      this.prefetchQueue.add(key)
    }
  }

  // Prefetch immediately (for critical data)
  async prefetchNow(key: string) {
    if (!this.prefetching.has(key)) {
      this.prefetching.add(key)
      await this.executePrefetch(key)
    }
  }
}

// Singleton prefetch manager
let prefetchManagerInstance: PrefetchManager | null = null

export function getPrefetchManager(): PrefetchManager {
  if (!prefetchManagerInstance) {
    prefetchManagerInstance = new PrefetchManager()
  }
  return prefetchManagerInstance
}