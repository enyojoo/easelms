"use client"

import { useEffect } from "react"
import { getRealtimeManager } from "@/lib/realtime/realtime-manager"

/**
 * Hook to set up intelligent real-time subscription for enrollments
 * Uses selective cache updates instead of aggressive invalidation
 */
export function useRealtimeEnrollments(userId?: string) {
  const { subscribeForUser } = getRealtimeManager()

  useEffect(() => {
    if (userId) {
      subscribeForUser(userId)
    }

    return () => {
      // Cleanup is handled by the manager
    }
  }, [userId, subscribeForUser])
}

/**
 * Hook to set up intelligent real-time subscription for progress
 * Uses selective cache updates with debouncing
 */
export function useRealtimeProgress(courseId?: string | number | null | undefined, userId?: string) {
  const { subscribeForUser } = getRealtimeManager()

  useEffect(() => {
    if (userId) {
      subscribeForUser(userId)
    }

    return () => {
      // Cleanup is handled by the manager
    }
  }, [userId, subscribeForUser])
}

/**
 * Hook to set up intelligent real-time subscription for quiz results
 * Uses selective cache updates for better performance
 */
export function useRealtimeQuizResults(courseId?: string | number, userId?: string) {
  const { subscribeForUser } = getRealtimeManager()

  useEffect(() => {
    if (userId) {
      subscribeForUser(userId)
    }

    return () => {
      // Cleanup is handled by the manager
    }
  }, [userId, subscribeForUser])
}

/**
 * Hook to set up intelligent real-time subscription for courses
 * Handles both course changes and enrollment count updates
 */
export function useRealtimeCourses() {
  // Courses real-time is handled by the intelligent manager
  // The manager subscribes to both courses and enrollments tables
  // and applies selective updates
}

/**
 * Hook to set up intelligent real-time subscription for course enrollments
 * Updates course enrollment counts in real-time
 */
export function useRealtimeCourseEnrollments(courseId?: string | number | null) {
  // This is now handled by the intelligent manager
  // which updates course caches when enrollments change
}

/**
 * Hook to set up intelligent real-time subscription for user purchases
 * Uses selective cache updates for purchase changes
 */
export function useRealtimePurchases(userId?: string) {
  const { subscribeForUser } = getRealtimeManager()

  useEffect(() => {
    if (userId) {
      subscribeForUser(userId)
    }

    return () => {
      // Cleanup is handled by the manager
    }
  }, [userId, subscribeForUser])
}

/**
 * Hook to set up intelligent real-time subscription for user profile
 * Updates profile data in real-time
 */
export function useRealtimeProfile(userId?: string) {
  const { subscribeForUser } = getRealtimeManager()

  useEffect(() => {
    if (userId) {
      subscribeForUser(userId)
    } else {
      // For cases where we want to subscribe to all profile changes (admin)
      // This would be handled by the manager's general subscriptions
    }

    return () => {
      // Cleanup is handled by the manager
    }
  }, [userId, subscribeForUser])
}

/**
 * Hook to set up intelligent real-time subscription for admin stats
 * Updates admin dashboard stats in real-time with selective caching
 */
export function useRealtimeAdminStats() {
  // Admin stats real-time is handled by the intelligent manager
  // The manager handles enrollments, profiles, progress, and purchases
  // and selectively updates admin stats without full invalidation
}

