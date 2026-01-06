/**
 * Centralized error handling utilities
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
 * Log error with context (for development/debugging)
 * In production, this should send to error tracking service
 */
export function logError(message: string, error: Error | unknown, context?: ErrorContext) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${message}`, {
      error,
      context,
      timestamp: new Date().toISOString(),
    })
  }
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
 * Log info (only in development)
 */
export function logInfo(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[INFO] ${message}`, data)
  }
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
 * Handle API error response
 */
export async function handleApiError(response: Response): Promise<Error> {
  let errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`
  
  try {
    const errorData = await response.json()
    if (errorData.error) {
      errorMessage = errorData.error
    } else if (errorData.message) {
      errorMessage = errorData.message
    }
  } catch {
    // If we can't parse the error, use the status-based message
  }

  return new Error(errorMessage)
}
