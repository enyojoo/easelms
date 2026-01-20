"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

/**
 * Hook to set up real-time subscription for enrollments
 * Automatically invalidates React Query cache when enrollments change
 */
export function useRealtimeEnrollments(userId?: string) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    
    // Subscribe to enrollments table changes for this user
    const channel = supabase
      .channel("enrollments-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "enrollments",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Enrollment change detected:", payload)
          // Invalidate enrollments cache to refetch
          queryClient.invalidateQueries({ queryKey: ["enrollments"] })
          // Also invalidate courses to update enrollment status
          queryClient.invalidateQueries({ queryKey: ["courses"] })
          // Invalidate the specific course cache if course_id is available
          if (payload.new && (payload.new as any).course_id) {
            queryClient.invalidateQueries({ queryKey: ["course", (payload.new as any).course_id] })
          } else if (payload.old && (payload.old as any).course_id) {
            queryClient.invalidateQueries({ queryKey: ["course", (payload.old as any).course_id] })
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, queryClient])
}

/**
 * Hook to set up real-time subscription for progress
 * Automatically invalidates React Query cache when progress changes
 */
export function useRealtimeProgress(courseId?: string | number | null | undefined, userId?: string) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    
    // Subscribe to progress table changes
    const filter = courseId 
      ? `user_id=eq.${userId},course_id=eq.${courseId}`
      : `user_id=eq.${userId}`
    
    const channel = supabase
      .channel("progress-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events
          schema: "public",
          table: "progress",
          filter: filter,
        },
        (payload) => {
          console.log("Progress change detected:", payload)
          // Invalidate progress cache - for all progress or specific course
          if (courseId) {
            queryClient.invalidateQueries({ queryKey: ["progress", courseId] })
          } else {
            queryClient.invalidateQueries({ queryKey: ["progress", "all"] })
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [courseId, userId, queryClient])
}

/**
 * Hook to set up real-time subscription for quiz results
 * Automatically invalidates React Query cache when quiz results change
 */
export function useRealtimeQuizResults(courseId?: string | number, userId?: string) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!courseId || !userId) return

    const supabase = createClient()
    
    // Subscribe to quiz_results table changes
    const channel = supabase
      .channel("quiz-results-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events
          schema: "public",
          table: "quiz_results",
          filter: `user_id=eq.${userId}${courseId ? `,course_id=eq.${courseId}` : ""}`,
        },
        (payload) => {
          console.log("Quiz results change detected:", payload)
          // Invalidate quiz results cache for the specific course
          queryClient.invalidateQueries({ queryKey: ["quiz-results", courseId] })
          // Also invalidate progress since quiz completion affects progress
          queryClient.invalidateQueries({ queryKey: ["progress", courseId] })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [courseId, userId, queryClient])
}

/**
 * Hook to set up real-time subscription for courses
 * Listens to course changes and enrollment changes that affect course counts
 * Useful for updating enrollment counts in real-time
 */
export function useRealtimeCourses() {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to courses table changes
    const channel = supabase
      .channel("courses-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
        },
        (payload) => {
          console.log("Course change detected:", payload)
          // Invalidate courses cache
          queryClient.invalidateQueries({ queryKey: ["courses"] })
          // If it's a specific course update, invalidate that too
          if (payload.new && (payload.new as any).id) {
            queryClient.invalidateQueries({ queryKey: ["course", (payload.new as any).id] })
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "enrollments",
        },
        (payload) => {
          console.log("Enrollment change detected (affecting course counts):", payload)
          // Invalidate all courses cache to update enrollment counts
          queryClient.invalidateQueries({ queryKey: ["courses"] })
          // Invalidate the specific course cache if course_id is available
          const courseId = (payload.new as any)?.course_id || (payload.old as any)?.course_id
          if (courseId) {
            queryClient.invalidateQueries({ queryKey: ["course", courseId] })
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [queryClient])
}

/**
 * Hook to set up real-time subscription for course enrollment count
 * Listens to enrollments for a specific course and updates the course cache
 */
export function useRealtimeCourseEnrollments(courseId?: string | number | null) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!courseId) return

    const supabase = createClient()
    
    // Subscribe to enrollments table changes for this specific course
    const channel = supabase
      .channel(`course-enrollments-${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "enrollments",
          filter: `course_id=eq.${courseId}`,
        },
        (payload) => {
          console.log("Course enrollment change detected:", payload)
          // Invalidate the specific course cache to refetch with updated enrollment count
          queryClient.invalidateQueries({ queryKey: ["course", courseId] })
          // Also invalidate all courses cache to update enrollment counts in lists
          queryClient.invalidateQueries({ queryKey: ["courses"] })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [courseId, queryClient])
}

/**
 * Hook to set up real-time subscription for user purchases
 * Automatically invalidates purchases cache when user's purchases change
 */
export function useRealtimePurchases(userId?: string) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // Subscribe to purchases changes for this specific user
    const channel = supabase
      .channel(`purchases-changes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "purchases",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Purchase change detected:", payload)
          // Invalidate purchases cache to refetch
          queryClient.invalidateQueries({ queryKey: ["purchases"] })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, queryClient])
}

/**
 * Hook to set up real-time subscription for user profile
 * Automatically invalidates profile cache when user's profile changes
 */
export function useRealtimeProfile(userId?: string) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // Subscribe to profile changes for this specific user
    const channel = supabase
      .channel(`profile-changes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log("Profile change detected:", payload)
          // Invalidate profile cache to refetch
          queryClient.invalidateQueries({ queryKey: ["profile"] })
          // Also dispatch custom event for components that need to react to profile updates
          window.dispatchEvent(new CustomEvent("profileUpdated"))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, queryClient])
}

/**
 * Hook to set up real-time subscription for admin stats
 * Useful for admin dashboard to see stats updates in real-time
 */
export function useRealtimeAdminStats() {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to multiple tables that affect admin stats
    const channel = supabase
      .channel("admin-stats-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enrollments",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
          queryClient.invalidateQueries({ queryKey: ["learners"] }) // Also invalidate learners when enrollments change
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          // Only invalidate if it's a user profile change (user_type = 'user')
          if (payload.new && (payload.new as any).user_type === "user") {
            queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
            queryClient.invalidateQueries({ queryKey: ["learners"] })
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "progress",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchases",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
          queryClient.invalidateQueries({ queryKey: ["purchases"] }) // Also invalidate purchases cache
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [queryClient])
}

