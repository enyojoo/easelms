import { useHasData } from "./useAppCache"
import type { DataType } from "../cache-config"

/**
 * Unified Skeleton Logic Hook
 * Provides consistent skeleton behavior across all pages
 */

export interface SkeletonOptions {
  /** Data types to check for cached data */
  dataTypes: DataType[]
  /** Additional loading conditions */
  additionalChecks?: boolean[]
}

/**
 * Hook that determines when to show skeleton
 * Returns true only on the very first load when no cached data exists
 */
export function useSkeletonLogic(options: SkeletonOptions): boolean {
  const { dataTypes, additionalChecks = [] } = options

  // Check if any cached data exists for the required types
  const hasAnyData = useHasData(dataTypes)

  // Check additional conditions (like auth loading)
  const additionalConditions = additionalChecks.some(check => check)

  // Show skeleton only if:
  // 1. No cached data exists for required types, AND
  // 2. At least one additional condition is true (e.g., auth loading)
  return !hasAnyData && additionalConditions
}

/**
 * Hook for page-level skeleton logic
 * Simplifies the most common use case
 */
export function usePageSkeleton(
  authLoading: boolean,
  userExists: boolean,
  requiredDataTypes: DataType[]
): boolean {
  return useSkeletonLogic({
    dataTypes: requiredDataTypes,
    additionalChecks: [authLoading || !userExists]
  })
}

/**
 * Hook for component-level skeleton logic
 * Useful for sections within pages
 */
export function useComponentSkeleton(
  isLoading: boolean,
  requiredDataTypes: DataType[]
): boolean {
  return useSkeletonLogic({
    dataTypes: requiredDataTypes,
    additionalChecks: [isLoading]
  })
}