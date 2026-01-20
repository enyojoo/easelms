# Unified Caching System Documentation

## Overview

This document describes the comprehensive caching system implemented across the LMS application. The system provides modern web app performance with instant page loads, smart data management, and real-time synchronization.

## Architecture

### Core Components

1. **`cache-config.ts`** - Centralized cache configuration and data type mappings
2. **`useAppCache.ts`** - Unified hooks for queries and mutations
3. **`useSkeleton.ts`** - Consistent skeleton loading patterns
4. **`useRoutePrefetch.ts`** - Route-based prefetching system
5. **`useConnectionAware.ts`** - Network-aware caching adjustments
6. **`useCacheDebug.ts`** - Cache statistics and debugging tools

### Data Flow

```
User Action → Hook Call → Cache Check → API Call (if needed) → localStorage Backup → UI Update
Real-time Events → Cache Invalidation → Background Refetch → UI Sync
```

## Cache Configuration Hierarchy

### Data Types & Cache Settings

| Data Type | Cache Time | GC Time | Use Case | Refetch Behavior |
|-----------|------------|---------|----------|------------------|
| `static` | 15 minutes | 30 minutes | Courses, profiles, settings | No window focus refetch |
| `dynamic` | 5 minutes | 15 minutes | Enrollments, progress, purchases | No window focus refetch |
| `realtime` | 1 minute | 5 minutes | Notifications, live data | Refetch on window focus |
| `admin` | 2 minutes | 10 minutes | Admin stats, management data | Refetch on window focus |

### Cache Keys Mapping

```typescript
const DATA_TYPE_CONFIGS = {
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
} as const
```

## Usage Guide

### Basic Query Usage

```typescript
import { useAppQuery } from '@/lib/react-query/hooks'

// Instead of useQuery
const { data, isPending, error } = useAppQuery(
  'courses',                    // Data type (configures cache behavior)
  ['courses'],                  // Query key
  async () => {                 // Query function
    const response = await fetch('/api/courses')
    return response.json()
  }
)
```

### Optimistic Mutations

```typescript
import { useAppMutation } from '@/lib/react-query/hooks'

const enrollCourse = useAppMutation(
  async ({ courseId }) => {
    const response = await fetch('/api/enrollments', {
      method: 'POST',
      body: JSON.stringify({ courseId })
    })
    return response.json()
  },
  {
    // Invalidate related queries
    invalidateQueries: [['enrollments'], ['courses']],

    // Optimistic update for instant UI feedback
    optimisticUpdate: {
      queryKey: ['enrollments'],
      updater: (oldData, variables) => ({
        ...oldData,
        enrollments: [...oldData.enrollments, {
          id: `temp-${variables.courseId}`,
          course_id: variables.courseId,
          enrolled_at: new Date().toISOString(),
          status: 'active'
        }]
      })
    }
  }
)
```

### Skeleton Loading

```typescript
import { usePageSkeleton } from '@/lib/react-query/hooks'

// For page-level skeleton
const showSkeleton = usePageSkeleton(
  authLoading,           // Auth loading state
  !!user,               // User exists
  ['courses', 'enrollments'] // Required data types
)

// For component-level skeleton
const showComponentSkeleton = useComponentSkeleton(
  isLoading,            // Component loading state
  ['progress']          // Required data types
)
```

### Real-time Subscriptions

```typescript
import { useRealtimeEnrollments, useRealtimeProgress } from '@/lib/react-query/hooks'

// Automatic cache invalidation on real-time events
useRealtimeEnrollments(user?.id)     // Invalidates ['enrollments']
useRealtimeProgress(courseId, user?.id) // Invalidates ['progress', courseId]
```

## Cache Behavior

### Page Load Behavior

```
First Visit Ever:
├── Show skeleton (no cached data)
├── Fetch from API
├── Cache in React Query + localStorage
└── Hide skeleton

Subsequent Visits:
├── Check localStorage cache
├── Show cached data instantly (no skeleton)
├── Background refetch if stale
└── Update UI silently
```

### Navigation Behavior

```
Page Navigation:
├── Instant content display (cached data)
├── No loading states
├── Background validation if needed
└── Real-time sync active
```

### Network Behavior

```
Online + Fast Connection:
├── Normal cache behavior
├── Background refetch on stale data
└── Real-time subscriptions active

Slow Connection:
├── Extended cache times
├── Reduced refetch frequency
└── Prioritize cached data

Offline:
├── Use cached data only
├── No API calls
├── Show offline indicator
└── Queue actions for reconnection
```

## localStorage Integration

### Automatic Persistence

```typescript
// Data is automatically cached in localStorage
const STORAGE_KEYS = {
  purchases: 'easelms_purchases',
  enrollments: 'easelms_enrollments',
  profile: 'easelms_profile',
  courses: 'easelms_courses',
  settings: 'easelms_settings',
  progress: 'easelms_progress',
}
```

### Fallback Behavior

```
API Error → Check localStorage → Return cached data → Continue with stale data
Network Offline → Use localStorage cache → Show offline mode
App Restart → Load from localStorage → Validate in background
```

## Real-time Integration

### Automatic Invalidation

```typescript
// Real-time events automatically invalidate cache
Enrollment Created → Invalidate ['enrollments'], ['courses']
Progress Updated → Invalidate ['progress', courseId]
Purchase Completed → Invalidate ['purchases'], ['enrollments']
```

### Background Synchronization

```typescript
// Real-time events trigger background refetch
Real-time Event → Invalidate cache → Background refetch → UI updates seamlessly
```

## Debugging & Monitoring

### Cache Statistics

```typescript
import { useCacheStats } from '@/lib/react-query/hooks'

const { totalQueries, cacheSize, hitRate, staleQueries } = useCacheStats()
```

### Debug Tools

```typescript
import { useCacheDebug } from '@/lib/react-query/hooks'

const { clearCache, invalidateAll, logCacheState } = useCacheDebug()

// Clear all cached data (logout, testing)
clearCache()

// Log current cache state
logCacheState()
```

### Cache Queries

```typescript
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// Get all cached queries
const allQueries = queryClient.getQueryCache().getAll()

// Check specific query
const coursesData = queryClient.getQueryData(['courses'])
```

## Best Practices

### Data Type Selection

```typescript
// Use correct data type for optimal caching
useAppQuery('static', ['courses'])     // Courses rarely change
useAppQuery('dynamic', ['enrollments']) // User-specific, changes with actions
useAppQuery('realtime', ['notifications']) // Live data, frequent updates
useAppQuery('admin', ['adminStats'])   // Admin data, shorter cache
```

### Query Key Patterns

```typescript
// Consistent query key patterns
['courses']                    // All courses
['courses', 'enrolled']        // User's enrolled courses
['course', courseId]           // Specific course
['enrollments']                // User's enrollments
['progress', courseId]         // Progress for specific course
['admin', 'stats']             // Admin statistics
```

### Optimistic Updates

```typescript
// Always provide rollback on error
optimisticUpdate: {
  queryKey: ['enrollments'],
  updater: (oldData, variables) => {
    // Return updated data
    return { ...oldData, enrollments: [...] }
  }
}
```

### Error Handling

```typescript
// Handle API errors gracefully
const { data, error, isPending } = useAppQuery('courses', ['courses'], fetchCourses)

if (error && !data) {
  // Show error state
  return <ErrorState message="Failed to load courses" />
}

if (isPending && !data) {
  // Show skeleton only on first load
  return <Skeleton />
}

// Show data (cached or fresh)
return <CourseList courses={data.courses} />
```

## Migration Guide

### From Old Hooks

```typescript
// Old way
import { useQuery, useMutation } from '@tanstack/react-query'

const { data } = useQuery({
  queryKey: ['courses'],
  queryFn: fetchCourses,
  staleTime: 10 * 60 * 1000,
  // ... more config
})

// New way
import { useAppQuery } from '@/lib/react-query/hooks'

const { data } = useAppQuery('courses', ['courses'], fetchCourses)
```

### From Manual localStorage

```typescript
// Old way - manual localStorage
const [data, setData] = useState(() => {
  const cached = localStorage.getItem('courses')
  return cached ? JSON.parse(cached) : null
})

// New way - automatic
const { data } = useAppQuery('courses', ['courses'], fetchCourses)
// localStorage handled automatically
```

## Performance Metrics

### Expected Performance

- **First load**: ~500ms (skeleton → data)
- **Subsequent loads**: ~50ms (instant from cache)
- **Navigation**: ~10ms (cached data display)
- **Background updates**: Silent, no UI impact
- **Cache hit rate**: >95% after initial load

### Cache Size Guidelines

- **Static data**: Keep < 2MB total
- **Dynamic data**: Keep < 1MB per user session
- **Admin data**: Keep < 500KB
- **localStorage**: Total < 5MB across all keys

## Troubleshooting

### Common Issues

**"Data not updating"**
- Check real-time subscriptions are active
- Verify cache invalidation is triggered
- Check network connectivity

**"Skeleton showing on every load"**
- Verify `usePageSkeleton` is used correctly
- Check if cached data exists: `queryClient.getQueryData(['courses'])`
- Ensure data types match in skeleton hook

**"Stale data showing"**
- Check cache configuration for data type
- Verify `staleTime` settings
- Force refetch: `queryClient.invalidateQueries(['courses'])`

**"localStorage errors"**
- Handle gracefully - system falls back to React Query cache
- Check for corrupted data: `localStorage.clear()`
- Monitor storage quota

### Debug Commands

```typescript
// Check cache state
console.log(queryClient.getQueryCache().getAll())

// Clear all caches
queryClient.clear()

// Check localStorage
Object.keys(localStorage).filter(key => key.startsWith('easelms_'))

// Force refetch
queryClient.invalidateQueries()
```

## Future Enhancements

### Potential Additions

1. **Service Worker** - Offline-first capabilities
2. **IndexedDB** - Larger data storage for courses
3. **Predictive Prefetching** - ML-based route prediction
4. **Cache Compression** - Reduce storage footprint
5. **Background Sync** - Queue failed requests

### Monitoring

- Track cache hit rates
- Monitor localStorage usage
- Log real-time sync performance
- Measure page load improvements

---

## Quick Reference

### Import Statement
```typescript
import {
  useAppQuery,
  useAppMutation,
  usePageSkeleton,
  useRealtimeEnrollments,
  useCacheStats
} from '@/lib/react-query/hooks'
```

### Most Common Patterns
```typescript
// Data fetching
const { data, isPending } = useAppQuery('courses', ['courses'], fetchCourses)

// Mutations with optimistic updates
const mutation = useAppMutation(mutateFn, { invalidateQueries: [['courses']] })

// Skeleton logic
const showSkeleton = usePageSkeleton(authLoading, !!user, ['courses'])

// Real-time sync
useRealtimeEnrollments(userId)
```

This caching system provides a modern, performant foundation for the LMS application with excellent user experience and maintainable code architecture.