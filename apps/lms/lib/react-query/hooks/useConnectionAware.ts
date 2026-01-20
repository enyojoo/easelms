import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

/**
 * Connection-aware caching hook
 * Adjusts caching behavior based on online/offline status
 */

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<'fast' | 'slow' | 'offline'>('fast')

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Detect connection speed (basic heuristic)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      const effectiveType = connection?.effectiveType

      if (effectiveType === '4g') {
        setConnectionType('fast')
      } else if (effectiveType === '3g' || effectiveType === '2g') {
        setConnectionType('slow')
      } else {
        setConnectionType('slow')
      }
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    connectionType,
    isSlowConnection: connectionType === 'slow',
    isOffline: !isOnline,
  }
}

/**
 * Hook that adjusts query behavior based on connection status
 */
export function useConnectionAwareQuery() {
  const { isOnline, isSlowConnection } = useConnectionStatus()
  const queryClient = useQueryClient()

  // Adjust default query options based on connection
  const getConnectionAwareOptions = (baseOptions: any = {}) => {
    if (!isOnline) {
      // Offline: Use only cached data, don't refetch
      return {
        ...baseOptions,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: Infinity, // Never consider stale
        networkMode: 'offlineFirst' as const,
      }
    }

    if (isSlowConnection) {
      // Slow connection: Reduce refetching, longer stale times
      return {
        ...baseOptions,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: baseOptions.staleTime ? baseOptions.staleTime * 2 : 10 * 60 * 1000, // Double stale time
      }
    }

    // Fast connection: Use normal behavior
    return baseOptions
  }

  // Force offline mode (useful for testing)
  const setOfflineMode = () => {
    queryClient.setDefaultOptions({
      queries: {
        networkMode: 'offlineFirst',
      },
    })
  }

  // Force online mode
  const setOnlineMode = () => {
    queryClient.setDefaultOptions({
      queries: {
        networkMode: 'online',
      },
    })
  }

  return {
    isOnline,
    isSlowConnection,
    getConnectionAwareOptions,
    setOfflineMode,
    setOnlineMode,
  }
}

/**
 * Hook to manage background sync when coming back online
 */
export function useBackgroundSync() {
  const { isOnline } = useConnectionStatus()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isOnline) {
      // When coming back online, invalidate stale queries
      queryClient.invalidateQueries({
        refetchType: 'active', // Only refetch active queries
      })
    }
  }, [isOnline, queryClient])

  const forceSync = () => {
    if (isOnline) {
      queryClient.invalidateQueries()
    }
  }

  return { forceSync }
}