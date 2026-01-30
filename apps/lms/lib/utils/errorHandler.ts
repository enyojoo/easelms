/**
 * Centralized error handling utilities for server-side code
 * Replaces console.log/error with proper error handling
 */

interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  courseId?: string | number
  lessonId?: string | number
  [key: string]: any
}

/**
 * Log error with context (always logs for debugging)
 * In production, Vercel captures console.error
 */
export function logError(message: string, error: Error | unknown, context?: ErrorContext) {
  // Always log - Vercel captures console.error in production
  console.error(`[ERROR] ${message}`, {
    error,
    context,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  })
  // TODO: In production, send to error tracking service (e.g., Sentry)
  // if (process.env.NODE_ENV === 'production') {
  //   errorTrackingService.captureException(error, { extra: context })
  // }
}

/**
 * Log warning with context
 */
export function logWarning(message: string, context?: ErrorContext) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[WARNING] ${message}`, {
      context,
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Log info (always logs, including production for debugging)
 */
export function logInfo(message: string, data?: any) {
  // Always log - Vercel captures console.log in production
  console.log(`[INFO] ${message}`, {
    ...data,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  })
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: Error | unknown, fallback: string = "An unexpected error occurred"): string {
  if (error instanceof Error) {
    // Don't expose technical error messages to users
    // Only show user-friendly messages
    const userFriendlyMessages: { [key: string]: string } = {
      'Failed to fetch': 'Unable to load data. Please check your connection and try again.',
      'Unauthorized': 'You need to be logged in to perform this action.',
      'Forbidden': 'You don\'t have permission to perform this action.',
      'Not Found': 'The requested resource was not found.',
      'Network request failed': 'Network error. Please check your connection.',
    }

    for (const [key, message] of Object.entries(userFriendlyMessages)) {
      if (error.message.includes(key)) {
        return message
      }
    }

    // For known errors, show the message
    if (error.message && !error.message.includes('Error:') && error.message.length < 100) {
      return error.message
    }
  }

  return fallback
}

/**
 * Create a detailed error response for API routes
 * Includes stack trace in development mode
 */
export function createErrorResponse(
  error: Error | unknown,
  status: number = 500,
  context?: ErrorContext
) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = process.env.NODE_ENV === 'development' && error instanceof Error
    ? error.stack
    : undefined

  // Log error for debugging
  logError("API Error", error, context)

  return {
    error: errorMessage,
    ...(errorStack && { stack: errorStack }),
    ...(context && { context }),
  }
}
