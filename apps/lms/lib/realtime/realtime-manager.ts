/**
 * Intelligent Real-Time Manager
 * Smart cache updates instead of aggressive invalidation
 * Features: Selective updates, debouncing, conflict resolution
 */

import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { getCacheManager } from "@/lib/cache/cache-manager"

interface RealtimeUpdate {
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  old?: any
  new?: any
  timestamp: number
}

interface SelectiveUpdateConfig {
  table: string
  events: ('INSERT' | 'UPDATE' | 'DELETE')[]
  selector: (payload: RealtimeUpdate) => string[] // Returns query keys to update
  transformer?: (payload: RealtimeUpdate, currentData: any) => any // Transforms data
  debounceMs?: number // Debounce multiple rapid updates
}

class RealtimeManager {
  private channels = new Map<string, RealtimeChannel>()
  private updateQueue = new Map<string, RealtimeUpdate[]>()
  private debounceTimers = new Map<string, NodeJS.Timeout>()
  private queryClient = useQueryClient()

  constructor() {
    // Initialize selective update configurations
    this.setupSelectiveUpdates()
  }

  private setupSelectiveUpdates() {
    // Enrollments: Smart updates
    this.addSelectiveConfig({
      table: 'enrollments',
      events: ['INSERT', 'UPDATE', 'DELETE'],
      selector: (payload) => {
        const keys = [['enrollments']]

        // If course_id is available, also invalidate course-specific data
        if (payload.new?.course_id) {
          keys.push(['courses']) // Invalidate courses to update enrollment counts
          keys.push(['course', payload.new.course_id])
        } else if (payload.old?.course_id) {
          keys.push(['courses'])
          keys.push(['course', payload.old.course_id])
        }

        return keys
      },
      transformer: (payload, currentData) => {
        if (!currentData?.enrollments) return currentData

        const enrollments = [...currentData.enrollments]

        switch (payload.event) {
          case 'INSERT':
            // Add new enrollment if not already present
            const exists = enrollments.some(e => e.id === payload.new.id)
            if (!exists) {
              enrollments.push(payload.new)
            }
            break

          case 'UPDATE':
            // Update existing enrollment
            const updateIndex = enrollments.findIndex(e => e.id === payload.new.id)
            if (updateIndex >= 0) {
              enrollments[updateIndex] = { ...enrollments[updateIndex], ...payload.new }
            }
            break

          case 'DELETE':
            // Remove enrollment
            const deleteIndex = enrollments.findIndex(e => e.id === payload.old.id)
            if (deleteIndex >= 0) {
              enrollments.splice(deleteIndex, 1)
            }
            break
        }

        return { ...currentData, enrollments }
      },
      debounceMs: 300 // Debounce enrollment updates
    })

    // Progress: Smart updates
    this.addSelectiveConfig({
      table: 'progress',
      events: ['INSERT', 'UPDATE', 'DELETE'],
      selector: (payload) => {
        const keys = [['progress']]

        // If lesson_id or course_id available, add specific keys
        if (payload.new?.course_id) {
          keys.push(['progress', 'course', payload.new.course_id])
        }

        return keys
      },
      transformer: (payload, currentData) => {
        if (!currentData) return currentData

        // Handle progress updates intelligently
        // This would update specific progress entries without full invalidation
        return currentData // For now, keep simple
      },
      debounceMs: 200 // Faster updates for progress
    })

    // Courses: Conservative updates (courses change less frequently)
    this.addSelectiveConfig({
      table: 'courses',
      events: ['UPDATE'], // Only listen to updates, not inserts/deletes (admin operations)
      selector: (payload) => {
        const keys = [['courses']]

        if (payload.new?.id) {
          keys.push(['course', payload.new.id])
        }

        return keys
      },
      debounceMs: 1000 // Slower updates for course changes
    })

    // Purchases: Selective updates
    this.addSelectiveConfig({
      table: 'purchases',
      events: ['INSERT', 'UPDATE'],
      selector: (payload) => [['purchases']],
      transformer: (payload, currentData) => {
        if (!currentData?.purchases) return currentData

        const purchases = [...currentData.purchases]

        switch (payload.event) {
          case 'INSERT':
            const exists = purchases.some(p => p.id === payload.new.id)
            if (!exists) {
              purchases.push(payload.new)
            }
            break

          case 'UPDATE':
            const updateIndex = purchases.findIndex(p => p.id === payload.new.id)
            if (updateIndex >= 0) {
              purchases[updateIndex] = { ...purchases[updateIndex], ...payload.new }
            }
            break
        }

        return { ...currentData, purchases }
      },
      debounceMs: 500
    })
  }

  private addSelectiveConfig(config: SelectiveUpdateConfig) {
    const channelKey = `realtime_${config.table}`

    // Store config for later use
    this.updateQueue.set(channelKey, [])

    // Set up the channel when needed
    this.setupChannel(channelKey, config)
  }

  private setupChannel(channelKey: string, config: SelectiveUpdateConfig) {
    const supabase = createClient()

    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events, filter in handler
          schema: "public",
          table: config.table,
        },
        (payload) => {
          this.handleRealtimeUpdate(channelKey, config, payload)
        }
      )

    this.channels.set(channelKey, channel)
  }

  private handleRealtimeUpdate(channelKey: string, config: SelectiveUpdateConfig, payload: any) {
    // Only process events we're configured for
    if (!config.events.includes(payload.eventType)) return

    const update: RealtimeUpdate = {
      table: config.table,
      event: payload.eventType,
      old: payload.old,
      new: payload.new,
      timestamp: Date.now()
    }

    // Add to queue
    const queue = this.updateQueue.get(channelKey) || []
    queue.push(update)
    this.updateQueue.set(channelKey, queue)

    // Debounce processing
    const debounceKey = `${channelKey}_${config.debounceMs}`
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey)!)
    }

    this.debounceTimers.set(debounceKey, setTimeout(() => {
      this.processQueuedUpdates(channelKey, config)
      this.debounceTimers.delete(debounceKey)
    }, config.debounceMs))
  }

  private async processQueuedUpdates(channelKey: string, config: SelectiveUpdateConfig) {
    const queue = this.updateQueue.get(channelKey) || []
    if (queue.length === 0) return

    // Get the latest update for each unique record
    const latestUpdates = new Map<string, RealtimeUpdate>()
    queue.forEach(update => {
      const recordKey = update.new?.id || update.old?.id || 'unknown'
      latestUpdates.set(recordKey, update)
    })

    // Process each unique update
    for (const update of latestUpdates.values()) {
      await this.applySelectiveUpdate(update, config)
    }

    // Clear queue
    this.updateQueue.set(channelKey, [])
  }

  private async applySelectiveUpdate(update: RealtimeUpdate, config: SelectiveUpdateConfig) {
    try {
      const queryKeys = config.selector(update)

      for (const queryKey of queryKeys) {
        // Try to update cache optimistically first
        if (config.transformer) {
          this.queryClient.setQueryData(queryKey, (currentData: any) => {
            return config.transformer!(update, currentData)
          })
        } else {
          // Fallback to invalidation for complex cases
          await this.queryClient.invalidateQueries({ queryKey })
        }
      }

      console.log(`Applied ${update.event} update for ${update.table}:`, update)
    } catch (error) {
      console.warn('Failed to apply selective update:', error)
      // Fallback to full invalidation
      await this.queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === update.table
      })
    }
  }

  // Subscribe to updates for a specific user
  subscribeForUser(userId: string) {
    // Start all configured channels
    for (const [channelKey, channel] of this.channels) {
      if (!channel.state || channel.state === 'closed') {
        channel.subscribe((status) => {
          console.log(`${channelKey} subscription:`, status)
        })
      }
    }
  }

  // Unsubscribe from all updates
  unsubscribeAll() {
    for (const [channelKey, channel] of this.channels) {
      channel.unsubscribe()
    }
    this.channels.clear()

    // Clear any pending updates
    this.updateQueue.clear()

    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }

  // Get current connection status
  getStatus() {
    const status: Record<string, string> = {}
    for (const [key, channel] of this.channels) {
      status[key] = channel.state || 'unknown'
    }
    return status
  }
}

// Singleton instance
let realtimeManagerInstance: RealtimeManager | null = null

export function getRealtimeManager(): RealtimeManager {
  if (!realtimeManagerInstance) {
    realtimeManagerInstance = new RealtimeManager()
  }
  return realtimeManagerInstance
}

// React hooks for using the realtime manager
export function useRealtimeManager() {
  const manager = getRealtimeManager()

  return {
    subscribeForUser: (userId: string) => manager.subscribeForUser(userId),
    unsubscribeAll: () => manager.unsubscribeAll(),
    getStatus: () => manager.getStatus()
  }
}