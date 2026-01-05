# Course Builder Architecture Review & Improvement Plan

## Executive Summary

This document provides a comprehensive review of the course builder architecture, identifying areas for improvement in database storage, S3 file management, and data fetching patterns. The goal is to create a scalable, maintainable, and performant system.

---

## 1. Database Storage Analysis

### 1.1 Current State

#### ✅ **Well-Architected (Normalized Tables)**
- **Quiz Questions**: Stored in `quiz_questions` table ✅
- **Quiz Attempts**: Stored in `quiz_attempts` table ✅
- **Quiz Results**: Stored in `quiz_results` table ✅
- **Courses**: Normalized table with proper columns ✅
- **Lessons**: Normalized table with proper columns ✅

#### ❌ **Needs Improvement (JSONB Storage)**

**1. Resources (Critical)**
- **Current**: Stored in `lessons.content.resources` (JSONB array)
- **Issues**:
  - No resource library/reuse across courses
  - No resource analytics (download counts, usage)
  - Difficult to query resources across courses
  - No resource versioning
  - No resource metadata tracking
  - Can't search/filter resources efficiently
  - Duplicate storage when same resource used in multiple lessons

**2. Quiz Settings (Medium Priority)**
- **Current**: Stored in `lessons.content.quiz` (JSONB object)
- **Issues**:
  - Settings mixed with content
  - Hard to query courses by quiz settings
  - No audit trail for setting changes
  - Inconsistent with quiz_questions normalization

**3. Lesson Content (Low Priority - Acceptable)**
- **Current**: `lessons.content` JSONB with `url`, `text`, `html`
- **Status**: ✅ Acceptable for now (flexible content structure)
- **Future Consideration**: Could normalize if we need rich content versioning

### 1.2 Recommended Database Schema Changes

#### **Priority 1: Resources Table (Standalone)**

```sql
-- Resources table (reusable across courses)
CREATE TABLE resources (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('document', 'link')),
  url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  s3_key TEXT, -- For S3 files, store the key for cleanup
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  download_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0, -- How many lessons use this resource
  
  -- Indexes
  CONSTRAINT resources_url_unique UNIQUE(url, created_by) -- Prevent exact duplicates
);

CREATE INDEX idx_resources_created_by ON resources(created_by);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_title ON resources(title);

-- Junction table for lesson-resource relationship (many-to-many)
CREATE TABLE lesson_resources (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT lesson_resources_unique UNIQUE(lesson_id, resource_id)
);

CREATE INDEX idx_lesson_resources_lesson ON lesson_resources(lesson_id);
CREATE INDEX idx_lesson_resources_resource ON lesson_resources(resource_id);
```

**Benefits:**
- Resource library for reuse
- Analytics (download counts, usage tracking)
- Efficient queries across courses
- No duplicate storage
- Better search/filter capabilities

#### **Priority 2: Quiz Settings Table**

```sql
-- Quiz settings table (normalize from JSONB)
CREATE TABLE quiz_settings (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- Settings
  enabled BOOLEAN NOT NULL DEFAULT false,
  shuffle_quiz BOOLEAN NOT NULL DEFAULT false,
  max_attempts INTEGER DEFAULT 3,
  show_correct_answers BOOLEAN NOT NULL DEFAULT true,
  allow_multiple_attempts BOOLEAN NOT NULL DEFAULT true,
  time_limit INTEGER, -- in seconds
  passing_score INTEGER, -- percentage
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT quiz_settings_lesson_unique UNIQUE(lesson_id)
);

CREATE INDEX idx_quiz_settings_lesson ON quiz_settings(lesson_id);
CREATE INDEX idx_quiz_settings_enabled ON quiz_settings(enabled);
```

**Benefits:**
- Consistent with quiz_questions normalization
- Easy to query courses by quiz settings
- Audit trail for changes
- Better data integrity

---

## 2. S3 Storage Analysis

### 2.1 Current State

#### ✅ **Good Practices**
- Organized folder structure (`courses/{courseId}/...`)
- File type validation
- Size limits enforced
- CloudFront CDN support (if configured)

#### ❌ **Issues**

**1. No Cleanup on Deletion**
- **Problem**: When course/lesson/resource is deleted, S3 files remain
- **Impact**: Storage costs accumulate, orphaned files
- **Solution**: Implement cleanup hooks

**2. No File Deduplication**
- **Problem**: Same file uploaded multiple times = multiple S3 objects
- **Impact**: Wasted storage, slower uploads
- **Solution**: Hash-based deduplication

**3. No File Versioning**
- **Problem**: Can't track file changes over time
- **Impact**: Hard to rollback, no history
- **Solution**: Version tracking in database

**4. Inefficient Path Structure**
- **Current**: `courses/{userId}/videos/{timestamp}-{filename}`
- **Issue**: Hard to find files by course/lesson
- **Better**: `courses/{courseId}/lessons/{lessonId}/videos/{hash}-{filename}`

**5. No File Metadata Tracking**
- **Problem**: File size, mime type not stored in DB
- **Impact**: Can't optimize delivery, hard to analyze
- **Solution**: Store in resources table

### 2.2 Recommended S3 Improvements

#### **Priority 1: Cleanup on Deletion**

```typescript
// When course/lesson/resource deleted:
// 1. Query database for all S3 keys
// 2. Delete from S3
// 3. Log cleanup operations
```

#### **Priority 2: File Deduplication**

```typescript
// Before upload:
// 1. Calculate file hash (SHA-256)
// 2. Check if hash exists in database
// 3. If exists, reuse existing S3 object
// 4. If not, upload and store hash
```

#### **Priority 3: Improved Path Structure**

```
courses/
  {courseId}/
    preview/
      thumbnail-{hash}.jpg
      video-{hash}.mp4
    lessons/
      {lessonId}/
        video-{hash}.mp4
        resources/
          {resourceId}-{hash}.pdf
```

---

## 3. Data Fetching Analysis

### 3.1 Current State

#### ✅ **Good Practices**
- React Query for learner frontend
- Caching with `staleTime`
- Optimistic updates in some places

#### ❌ **Issues**

**1. Inconsistent Patterns**
- **Admin**: Uses `useEffect` + `fetch` (no React Query)
- **Learner**: Uses React Query hooks
- **Impact**: Different caching, error handling, loading states

**2. No Optimistic Updates (Admin)**
- **Problem**: Admin actions feel slow
- **Impact**: Poor UX, perceived lag

**3. Large Payloads**
- **Problem**: Fetching entire course with all lessons/resources
- **Impact**: Slow initial load, high bandwidth
- **Solution**: Pagination, lazy loading

**4. No Request Deduplication**
- **Problem**: Multiple components fetch same data
- **Impact**: Unnecessary API calls
- **Solution**: React Query handles this, but admin doesn't use it

**5. No Background Refetching**
- **Problem**: Stale data shown to users
- **Impact**: Inconsistent state
- **Solution**: `refetchInterval` or WebSocket

### 3.2 Recommended Data Fetching Improvements

#### **Priority 1: Standardize on React Query**

```typescript
// Admin should use React Query too
// Benefits:
// - Consistent caching
// - Automatic request deduplication
// - Optimistic updates
// - Background refetching
// - Error retry logic
```

#### **Priority 2: Implement Pagination**

```typescript
// For course list pages:
// - Paginate courses (20 per page)
// - Infinite scroll or "Load More"
// - Virtual scrolling for large lists
```

#### **Priority 3: Lazy Load Lesson Content**

```typescript
// Don't fetch all lesson content upfront
// Fetch lesson content when:
// - User expands lesson
// - User navigates to lesson
// - User scrolls near lesson
```

#### **Priority 4: Optimistic Updates**

```typescript
// For admin actions:
// - Update UI immediately
// - Rollback on error
// - Show loading states
```

---

## 4. Performance Optimizations

### 4.1 Database

1. **Add Missing Indexes**
   ```sql
   -- For common queries
   CREATE INDEX idx_lessons_course_order ON lessons(course_id, order_index);
   CREATE INDEX idx_courses_published ON courses(is_published, created_at);
   ```

2. **Query Optimization**
   - Use `SELECT` with specific columns (not `*`)
   - Implement pagination for large result sets
   - Use database views for complex queries

3. **Connection Pooling**
   - Ensure Supabase connection pooling is configured
   - Monitor connection usage

### 4.2 Frontend

1. **Code Splitting**
   - Lazy load course builder components
   - Split admin and learner routes

2. **Image Optimization**
   - Use Next.js Image component
   - Implement responsive images
   - Lazy load images below fold

3. **Bundle Size**
   - Analyze bundle size
   - Remove unused dependencies
   - Tree-shake imports

### 4.3 API

1. **Response Compression**
   - Enable gzip/brotli compression
   - Compress JSON responses

2. **Caching Headers**
   - Set appropriate cache headers
   - Use ETags for conditional requests

3. **Rate Limiting**
   - Implement rate limiting for API routes
   - Prevent abuse

---

## 5. Implementation Plan

### Phase 1: Resources Migration (High Priority)

**Goal**: Migrate resources from JSONB to normalized tables

**Steps**:
1. Create migration SQL for `resources` and `lesson_resources` tables
2. Create data migration script to move existing JSONB resources
3. Update API routes (`/api/courses/drafts`, `/api/courses/[id]`)
4. Update frontend components (LessonBuilder, ResourceCard)
5. Remove JSONB resource storage
6. Add resource library UI for admins
7. Test migration with existing courses
8. Deploy migration

**Estimated Time**: 2-3 days

### Phase 2: Quiz Settings Normalization (Medium Priority)

**Goal**: Move quiz settings from JSONB to dedicated table

**Steps**:
1. Create migration SQL for `quiz_settings` table
2. Migrate existing quiz settings from JSONB
3. Update API routes to use new table
4. Update frontend to read from new table
5. Remove JSONB quiz settings storage
6. Test with existing quizzes

**Estimated Time**: 1-2 days

### Phase 3: S3 Improvements (Medium Priority)

**Goal**: Implement cleanup, deduplication, and better organization

**Steps**:
1. Implement S3 cleanup on course/lesson/resource deletion
2. Add file hash calculation and deduplication
3. Update S3 path structure
4. Add file metadata tracking
5. Create cleanup job for orphaned files
6. Test cleanup with sample deletions

**Estimated Time**: 2-3 days

### Phase 4: Data Fetching Standardization (High Priority)

**Goal**: Use React Query consistently across admin and learner

**Steps**:
1. Create React Query hooks for admin (if missing)
2. Migrate admin pages from `useEffect` to React Query
3. Implement optimistic updates for admin actions
4. Add pagination to course lists
5. Implement lazy loading for lesson content
6. Add background refetching
7. Test performance improvements

**Estimated Time**: 2-3 days

### Phase 5: Performance Optimizations (Low Priority)

**Goal**: Optimize database queries, frontend bundle, and API responses

**Steps**:
1. Add missing database indexes
2. Optimize API queries (specific columns, pagination)
3. Implement code splitting
4. Add image optimization
5. Analyze and reduce bundle size
6. Add response compression
7. Implement caching headers

**Estimated Time**: 2-3 days

---

## 6. Migration Strategy

### 6.1 Backward Compatibility

During migration, maintain backward compatibility:
- Read from both JSONB and tables (fallback to JSONB)
- Write to both during transition
- Remove JSONB writes after migration complete
- Remove JSONB reads after verification

### 6.2 Rollback Plan

- Keep JSONB data intact during migration
- Create rollback migration scripts
- Test rollback procedure
- Document rollback steps

### 6.3 Testing Strategy

1. **Unit Tests**: Test migration scripts
2. **Integration Tests**: Test API routes with new schema
3. **E2E Tests**: Test full course creation/editing flow
4. **Performance Tests**: Compare before/after performance
5. **Data Validation**: Verify all data migrated correctly

---

## 7. Success Metrics

### Database
- ✅ Resources in normalized tables
- ✅ Quiz settings in normalized tables
- ✅ No JSONB for resources/quiz settings
- ✅ Resource library functional
- ✅ Query performance improved

### S3
- ✅ Cleanup on deletion working
- ✅ File deduplication active
- ✅ Improved path structure
- ✅ File metadata tracked

### Data Fetching
- ✅ React Query used consistently
- ✅ Optimistic updates working
- ✅ Pagination implemented
- ✅ Lazy loading active
- ✅ Reduced API calls

### Performance
- ✅ Faster page loads
- ✅ Smaller bundle size
- ✅ Better database query performance
- ✅ Reduced S3 storage costs

---

## 8. Risks & Mitigation

### Risk 1: Data Loss During Migration
- **Mitigation**: Backup database before migration, test on staging first

### Risk 2: Breaking Changes
- **Mitigation**: Maintain backward compatibility, gradual rollout

### Risk 3: Performance Regression
- **Mitigation**: Monitor performance metrics, rollback if needed

### Risk 4: S3 Cleanup Errors
- **Mitigation**: Log all deletions, implement dry-run mode, manual verification

---

## 9. Next Steps

1. **Review this plan** with the team
2. **Prioritize phases** based on business needs
3. **Create detailed tickets** for each phase
4. **Set up staging environment** for testing
5. **Begin Phase 1** (Resources Migration)

---

## 10. Questions to Consider

1. **Resource Library**: Should resources be shared across all admins or per-admin?
2. **File Deduplication**: Should we deduplicate across all users or per-user?
3. **S3 Cleanup**: Immediate deletion or soft delete with cleanup job?
4. **Migration Timeline**: Big bang or gradual rollout?
5. **Feature Flags**: Use feature flags for gradual rollout?

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: Architecture Review
