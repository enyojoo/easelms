import type { QueryOptions } from "@tanstack/react-query"

/**
 * Unified Cache Configuration
 * Defines standardized cache settings for different types of data
 */

export interface CacheConfig extends Omit<QueryOptions, 'queryKey' | 'queryFn'> {
  staleTime: number
  gcTime: number
  refetchOnWindowFocus: boolean
  refetchOnReconnect: boolean
  refetchOnMount: boolean | 'always'
}

// Cache time constants (in milliseconds)
export const CACHE_TIMES = {
  STATIC: 15 * 60 * 1000,      // 15 minutes - courses, user profile, settings
  DYNAMIC: 5 * 60 * 1000,      // 5 minutes - enrollments, progress, purchases
  REALTIME: 1 * 60 * 1000,     // 1 minute - notifications, chat, live data
  IMMEDIATE: 0,                // 0 - user actions, immediate invalidation
} as const

export const GC_TIMES = {
  STATIC: 30 * 60 * 1000,      // 30 minutes
  DYNAMIC: 15 * 60 * 1000,     // 15 minutes
  REALTIME: 5 * 60 * 1000,     // 5 minutes
  IMMEDIATE: 2 * 60 * 1000,    // 2 minutes
} as const

// Standardized cache configurations
export const CACHE_CONFIGS = {
  // Static data - rarely changes, long cache times
  static: {
    staleTime: CACHE_TIMES.STATIC,
    gcTime: GC_TIMES.STATIC,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
  } as CacheConfig,

  // Dynamic data - changes with user actions, medium cache times
  dynamic: {
    staleTime: CACHE_TIMES.DYNAMIC,
    gcTime: GC_TIMES.DYNAMIC,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
  } as CacheConfig,

  // Real-time data - frequently updated, short cache times
  realtime: {
    staleTime: CACHE_TIMES.REALTIME,
    gcTime: GC_TIMES.REALTIME,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: false,
  } as CacheConfig,

  // Immediate data - user actions, no caching
  immediate: {
    staleTime: CACHE_TIMES.IMMEDIATE,
    gcTime: GC_TIMES.IMMEDIATE,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
  } as CacheConfig,

  // Admin data - shorter cache times for content management
  admin: {
    staleTime: 2 * 60 * 1000,    // 2 minutes
    gcTime: 10 * 60 * 1000,      // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: false,
  } as CacheConfig,
} as const

// Data type mappings - which cache config to use for which data
export const DATA_TYPE_CONFIGS = {
  // Learner data
  courses: 'static',
  course: 'static',
  profile: 'static',
  enrollments: 'dynamic',
  progress: 'dynamic',
  purchases: 'dynamic',
  quizResults: 'dynamic',

  // Admin data
  adminStats: 'admin',
  adminLearners: 'admin',
  adminCourses: 'admin',
  adminPurchases: 'admin',
  adminSettings: 'admin',

  // Shared data
  settings: 'static',
  brandSettings: 'static',
  users: 'dynamic',
} as const

export type DataType = keyof typeof DATA_TYPE_CONFIGS

/**
 * Get cache config for a specific data type
 */
export function getCacheConfig(dataType: DataType): CacheConfig {
  const configKey = DATA_TYPE_CONFIGS[dataType]
  return CACHE_CONFIGS[configKey]
}

/**
 * Create a complete query options object with cache settings
 */
export function createQueryOptions<T>(
  dataType: DataType,
  overrides?: Partial<QueryOptions<T>>
): QueryOptions<T> {
  const baseConfig = getCacheConfig(dataType)

  return {
    ...baseConfig,
    ...overrides,
  }
}