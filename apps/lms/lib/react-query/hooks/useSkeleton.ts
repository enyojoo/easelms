/**
 * Unified Skeleton Logic Hook
 * Provides consistent skeleton behavior across all pages
 */

export interface SkeletonOptions {
  /** Direct data objects to check */
  dataObjects?: any[]
  /** Additional loading conditions */
  additionalChecks?: boolean[]
}

/**
 * Hook that determines when to show skeleton
 * Returns true only on the very first load when no cached data exists
 */
export function useSkeletonLogic(options: SkeletonOptions): boolean {
  const { dataObjects = [], additionalChecks = [] } = options

  // Check if any data objects exist
  const hasDataObjects = dataObjects.some(data => data !== undefined && data !== null)

  // Check additional conditions (like auth loading)
  const additionalConditions = additionalChecks.some(check => check)

  // Show skeleton only if:
  // 1. No data exists, AND
  // 2. At least one additional condition is true (e.g., auth loading)
  return !hasDataObjects && additionalConditions
}

/**
 * Hook for page-level skeleton logic
 * Simplifies the most common use case
 */
export function usePageSkeleton(
  authLoading: boolean,
  userExists: boolean,
  dataObjects: any[]
): boolean {
  return useSkeletonLogic({
    dataObjects,
    additionalChecks: [authLoading || !userExists]
  })
}

/**
 * Hook for component-level skeleton logic
 * Useful for sections within pages
 */
export function useComponentSkeleton(
  isLoading: boolean,
  dataObjects: any[]
): boolean {
  return useSkeletonLogic({
    dataObjects,
    additionalChecks: [isLoading]
  })
}