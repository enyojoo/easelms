# React Query & Real-time Subscriptions Implementation

## Overview

This document describes the implementation of React Query (TanStack Query) for data fetching and caching, along with Supabase real-time subscriptions for live data updates.

## What Was Implemented

### 1. React Query Infrastructure
- ✅ Installed `@tanstack/react-query` and `@tanstack/react-query-devtools`
- ✅ Created `QueryProvider` component with optimized default settings
- ✅ Integrated `QueryProvider` into `ClientLayout`

### 2. Custom React Query Hooks
Created reusable hooks in `lib/react-query/hooks/`:
- `useCourses` - Fetch all courses or single course
- `useEnrollments` - Fetch user enrollments
- `useProgress` - Fetch and save course progress
- `useQuizResults` - Fetch and submit quiz results
- `useLearners` - Fetch learners (admin only)
- `useAdminStats` - Fetch admin dashboard statistics

### 3. Real-time Subscriptions
Created hooks in `lib/react-query/hooks/useRealtime.ts`:
- `useRealtimeEnrollments` - Listen for enrollment changes
- `useRealtimeProgress` - Listen for progress updates
- `useRealtimeQuizResults` - Listen for quiz result changes
- `useRealtimeCourses` - Listen for course updates (admin)
- `useRealtimeAdminStats` - Listen for stats-affecting changes

### 4. Updated Pages (Examples)
- ✅ `app/learner/courses/page.tsx` - Uses `useCourses` and `useEnrollments`
- ✅ `app/learner/dashboard/page.tsx` - Uses React Query for base data
- ✅ `app/admin/dashboard/page.tsx` - Uses `useAdminStats`

## How to Use

### Basic Data Fetching

Replace `useEffect` + `fetch` patterns with React Query hooks:

**Before:**
```tsx
const [courses, setCourses] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/courses")
      const data = await response.json()
      setCourses(data.courses)
    } finally {
      setLoading(false)
    }
  }
  fetchCourses()
}, [])
```

**After:**
```tsx
import { useCourses } from "@/lib/react-query/hooks"

const { data, isLoading, error } = useCourses()

const courses = data?.courses || []
```

### Real-time Subscriptions

Add real-time hooks to automatically update data when it changes in Supabase:

```tsx
import { useEnrollments, useRealtimeEnrollments } from "@/lib/react-query/hooks"

const { data: enrollments } = useEnrollments()
useRealtimeEnrollments(user?.id) // Automatically invalidates cache on changes
```

### Mutations (Creating/Updating Data)

Use mutation hooks for POST/PUT/DELETE operations:

```tsx
import { useEnrollCourse } from "@/lib/react-query/hooks"

const enrollMutation = useEnrollCourse()

const handleEnroll = async () => {
  try {
    await enrollMutation.mutateAsync(courseId)
    // Cache is automatically invalidated and refetched
  } catch (error) {
    console.error("Failed to enroll:", error)
  }
}
```

### Cache Invalidation

Manually invalidate cache when needed:

```tsx
import { useInvalidateCourses } from "@/lib/react-query/hooks"

const invalidateCourses = useInvalidateCourses()

// After creating/updating a course
invalidateCourses()
```

## Pages to Update

### Learner Pages
- [ ] `app/learner/courses/[id]/page.tsx` - Use `useCourse(id)`
- [ ] `app/learner/courses/[id]/learn/page.tsx` - Use `useProgress`, `useQuizResults`
- [ ] `app/learner/profile/page.tsx` - Use appropriate hooks

### Admin Pages
- [ ] `app/admin/courses/page.tsx` - Use `useCourses({ all: true })`
- [ ] `app/admin/courses/[id]/page.tsx` - Use `useCourse(id)`
- [ ] `app/admin/learners/page.tsx` - Use `useLearners()`
- [ ] `app/admin/learners/[id]/page.tsx` - Use `useLearner(id)`
- [ ] `app/admin/purchases/page.tsx` - Create `usePurchases` hook if needed

## Real-time Subscription Usage

### When to Use Real-time

Use real-time subscriptions for:
- ✅ Data that changes frequently (progress, quiz results)
- ✅ Data that multiple users might update (enrollments, courses)
- ✅ Admin dashboards that need live updates

### Example: Course Learning Page

```tsx
import { useProgress, useQuizResults, useRealtimeProgress, useRealtimeQuizResults } from "@/lib/react-query/hooks"

export default function CourseLearningPage() {
  const { user } = useClientAuthState()
  const courseId = "123"
  
  // Fetch data
  const { data: progress } = useProgress(courseId)
  const { data: quizResults } = useQuizResults(courseId)
  
  // Set up real-time subscriptions
  useRealtimeProgress(courseId, user?.id)
  useRealtimeQuizResults(courseId, user?.id)
  
  // Data automatically updates when changed in Supabase
}
```

## Cache Configuration

Default cache settings (in `QueryProvider`):
- `staleTime`: 60 seconds - Data is considered fresh for 1 minute
- `gcTime`: 5 minutes - Unused cache is garbage collected after 5 minutes
- `refetchOnWindowFocus`: false - Don't refetch when window regains focus
- `retry`: 1 - Retry failed requests once

You can override these per-query:

```tsx
const { data } = useCourses({
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

## Benefits

1. **Automatic Caching** - Data is cached and reused across components
2. **Background Refetching** - Stale data is refetched in the background
3. **Real-time Updates** - Data updates automatically via Supabase subscriptions
4. **Optimistic Updates** - UI updates immediately, then syncs with server
5. **Error Handling** - Built-in error states and retry logic
6. **Loading States** - Built-in loading states
7. **DevTools** - React Query DevTools for debugging (dev mode only)

## Migration Checklist

For each page:
1. ✅ Import React Query hooks
2. ✅ Replace `useState` + `useEffect` + `fetch` with React Query hooks
3. ✅ Add real-time subscriptions if data changes frequently
4. ✅ Update loading/error states to use React Query's built-in states
5. ✅ Test that data updates correctly
6. ✅ Verify real-time updates work

## Troubleshooting

### Data not updating
- Check if real-time subscription is set up
- Verify Supabase real-time is enabled for the table
- Check browser console for subscription errors

### Cache not invalidating
- Use `useInvalidate*` hooks after mutations
- Check that mutation hooks have `onSuccess` callbacks

### Too many requests
- Increase `staleTime` for data that doesn't change often
- Use `enabled: false` to prevent automatic fetching

## Next Steps

1. Update remaining pages to use React Query hooks
2. Add more real-time subscriptions where needed
3. Consider adding optimistic updates for better UX
4. Monitor cache performance and adjust `staleTime` as needed

