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
    
    // Subscribe to enrollments table changes
    const channel = supabase
      .channel("enrollments-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "enrollments",
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        (payload) => {
          console.log("Enrollment change detected:", payload)
          // Invalidate enrollments cache to refetch
          queryClient.invalidateQueries({ queryKey: ["enrollments"] })
          // Also invalidate courses to update enrollment status
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
 * Hook to set up real-time subscription for courses (admin only)
 * Useful for admin dashboard to see course updates in real-time
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

