import { useQueryClient } from "@tanstack/react-query"

/**
 * Cache debugging and statistics hook
 * Provides insights into cache performance and debugging tools
 */

export interface CacheStats {
  totalQueries: number
  activeQueries: number
  inactiveQueries: number
  cacheSize: string
  hitRate: number
  staleQueries: number
  freshQueries: number
}

export function useCacheStats(): CacheStats {
  const queryClient = useQueryClient()

  const cache = queryClient.getQueryCache()
  const allQueries = cache.getAll()

  const activeQueries = allQueries.filter(query => query.isActive())
  const inactiveQueries = allQueries.filter(query => !query.isActive())
  const staleQueries = allQueries.filter(query => query.isStale())
  const freshQueries = allQueries.filter(query => !query.isStale())

  // Estimate cache size (rough calculation)
  const estimatedSize = allQueries.reduce((size, query) => {
    const querySize = JSON.stringify(query.state.data || {}).length
    return size + querySize
  }, 0)

  // Calculate hit rate (queries with data / total queries)
  const queriesWithData = allQueries.filter(query => query.state.data !== undefined).length
  const hitRate = allQueries.length > 0 ? (queriesWithData / allQueries.length) * 100 : 0

  return {
    totalQueries: allQueries.length,
    activeQueries: activeQueries.length,
    inactiveQueries: inactiveQueries.length,
    cacheSize: `${(estimatedSize / 1024).toFixed(2)} KB`,
    hitRate: Math.round(hitRate),
    staleQueries: staleQueries.length,
    freshQueries: freshQueries.length,
  }
}

/**
 * Hook for cache debugging and management
 */
export function useCacheDebug() {
  const queryClient = useQueryClient()
  const stats = useCacheStats()

  const clearCache = () => {
    queryClient.clear()
  }

  const invalidateAll = () => {
    queryClient.invalidateQueries()
  }

  const invalidateStale = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.isStale(),
    })
  }

  const getQueryDetails = () => {
    const cache = queryClient.getQueryCache()
    return cache.getAll().map(query => ({
      key: query.queryKey,
      isActive: query.isActive(),
      isStale: query.isStale(),
      dataUpdatedAt: query.state.dataUpdatedAt,
      errorUpdatedAt: query.state.errorUpdatedAt,
      hasData: !!query.state.data,
      hasError: !!query.state.error,
      fetchStatus: query.state.fetchStatus,
      status: query.state.status,
    }))
  }

  const logCacheState = () => {
    console.group('🔍 Cache Debug Info')
    console.log('📊 Stats:', stats)
    console.log('📋 Queries:', getQueryDetails())
    console.groupEnd()
  }

  return {
    stats,
    clearCache,
    invalidateAll,
    invalidateStale,
    getQueryDetails,
    logCacheState,
  }
}