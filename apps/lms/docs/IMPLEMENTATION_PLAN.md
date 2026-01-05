# Course Builder Architecture - Implementation Plan

## Overview

This document provides a detailed, step-by-step implementation plan for improving the course builder architecture. Each phase is broken down into specific tasks with code examples and testing requirements.

---

## Phase 1: Resources Migration (Standalone Approach)

### Goal
Migrate resources from JSONB storage (`lessons.content.resources`) to normalized `resources` and `lesson_resources` tables.

### Prerequisites
- Database backup
- Staging environment ready
- Test data available

### Step 1.1: Create Database Migration

**File**: `apps/lms/supabase/migrations/004_create_resources_tables.sql`

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

-- Add comment for documentation
COMMENT ON TABLE resources IS 'Reusable resources that can be shared across multiple lessons and courses';
COMMENT ON TABLE lesson_resources IS 'Junction table linking lessons to resources with ordering';
```

**Tasks**:
- [ ] Create migration file
- [ ] Test migration on local database
- [ ] Verify indexes are created
- [ ] Check foreign key constraints

### Step 1.2: Create Data Migration Script

**File**: `apps/lms/scripts/migrate-resources-from-jsonb.ts`

```typescript
/**
 * Migration script to move resources from JSONB to normalized tables
 * 
 * This script:
 * 1. Reads all lessons with resources in content JSONB
 * 2. Creates resource records (deduplicates by URL + user)
 * 3. Creates lesson_resources junction records
 * 4. Validates migration
 */

import { createServiceRoleClient } from "@/lib/supabase/server"

async function migrateResources() {
  const supabase = createServiceRoleClient()
  
  // 1. Fetch all lessons with resources
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, content, course_id")
    .not("content", "is", null)
  
  if (lessonsError) {
    console.error("Error fetching lessons:", lessonsError)
    return
  }
  
  console.log(`Found ${lessons.length} lessons to process`)
  
  // 2. Process each lesson
  let resourcesCreated = 0
  let lessonResourcesCreated = 0
  const resourceUrlMap = new Map<string, number>() // URL + userId -> resource_id
  
  for (const lesson of lessons) {
    const content = lesson.content as any
    const resources = content?.resources || []
    
    if (!Array.isArray(resources) || resources.length === 0) {
      continue
    }
    
    // Get course creator (for created_by)
    const { data: course } = await supabase
      .from("courses")
      .select("created_by")
      .eq("id", lesson.course_id)
      .single()
    
    if (!course) {
      console.warn(`Course not found for lesson ${lesson.id}`)
      continue
    }
    
    // Process each resource
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i]
      const resourceKey = `${resource.url}-${course.created_by}`
      
      // Check if resource already exists
      let resourceId = resourceUrlMap.get(resourceKey)
      
      if (!resourceId) {
        // Create new resource
        const { data: existingResource } = await supabase
          .from("resources")
          .select("id")
          .eq("url", resource.url)
          .eq("created_by", course.created_by)
          .single()
        
        if (existingResource) {
          resourceId = existingResource.id
          // Update usage count
          await supabase
            .from("resources")
            .update({ usage_count: supabase.raw("usage_count + 1") })
            .eq("id", resourceId)
        } else {
          // Extract S3 key from URL if it's an S3 URL
          let s3Key: string | null = null
          if (resource.url.includes("s3.amazonaws.com") || resource.url.includes("cloudfront.net")) {
            // Extract key from URL
            try {
              const urlObj = new URL(resource.url)
              s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
            } catch (e) {
              // Invalid URL, skip S3 key extraction
            }
          }
          
          const { data: newResource, error: insertError } = await supabase
            .from("resources")
            .insert({
              title: resource.title || "Untitled Resource",
              description: resource.description || null,
              type: resource.type || "document",
              url: resource.url,
              file_size: resource.fileSize || null,
              mime_type: null, // Can be extracted from URL if needed
              s3_key: s3Key,
              created_by: course.created_by,
            })
            .select("id")
            .single()
          
          if (insertError) {
            console.error(`Error creating resource for lesson ${lesson.id}:`, insertError)
            continue
          }
          
          resourceId = newResource.id
          resourcesCreated++
        }
        
        resourceUrlMap.set(resourceKey, resourceId)
      }
      
      // Create lesson_resources junction record
      const { error: junctionError } = await supabase
        .from("lesson_resources")
        .insert({
          lesson_id: lesson.id,
          resource_id: resourceId,
          order_index: i,
        })
      
      if (junctionError) {
        console.error(`Error creating lesson_resource for lesson ${lesson.id}:`, junctionError)
        continue
      }
      
      lessonResourcesCreated++
    }
  }
  
  console.log(`Migration complete:`)
  console.log(`- Resources created: ${resourcesCreated}`)
  console.log(`- Lesson-resource links created: ${lessonResourcesCreated}`)
  
  // 3. Validate migration
  const { data: allLessons } = await supabase
    .from("lessons")
    .select("id, content")
  
  let jsonbResourcesCount = 0
  for (const lesson of allLessons || []) {
    const content = lesson.content as any
    const resources = content?.resources || []
    if (Array.isArray(resources) && resources.length > 0) {
      jsonbResourcesCount += resources.length
    }
  }
  
  const { data: migratedResources } = await supabase
    .from("lesson_resources")
    .select("id", { count: "exact" })
  
  console.log(`Validation:`)
  console.log(`- Resources still in JSONB: ${jsonbResourcesCount}`)
  console.log(`- Resources migrated: ${migratedResources?.length || 0}`)
  
  if (jsonbResourcesCount > 0) {
    console.warn("⚠️  Some resources still exist in JSONB. Review before removing JSONB storage.")
  }
}

// Run migration
migrateResources()
  .then(() => {
    console.log("Migration script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Migration script failed:", error)
    process.exit(1)
  })
```

**Tasks**:
- [ ] Create migration script
- [ ] Test on local database with sample data
- [ ] Run on staging database
- [ ] Validate results
- [ ] Document any edge cases

### Step 1.3: Update API Routes - Save Draft

**File**: `apps/lms/app/api/courses/drafts/route.ts`

**Changes Needed**:
1. Remove resources from `lessonContent` JSONB
2. Save resources to `resources` table
3. Create `lesson_resources` junction records
4. Handle updates/deletes

**Key Code Changes**:

```typescript
// After saving lessons, process resources
for (let lessonIndex = 0; lessonIndex < courseData.lessons.length; lessonIndex++) {
  const lesson = courseData.lessons[lessonIndex]
  const actualLessonId = lessonIdMap.get(lessonIndex)
  
  if (!actualLessonId) continue
  
  // Get existing resources for this lesson
  const { data: existingLessonResources } = await dbClient
    .from("lesson_resources")
    .select("resource_id")
    .eq("lesson_id", actualLessonId)
  
  const existingResourceIds = new Set(
    (existingLessonResources || []).map((lr: any) => lr.resource_id)
  )
  
  // Process resources from lesson data
  const resources = lesson.resources || []
  const currentResourceIds = new Set<number>()
  
  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i]
    
    // Check if resource already exists (by URL + user)
    let resourceId: number | null = null
    
    const { data: existingResource } = await dbClient
      .from("resources")
      .select("id")
      .eq("url", resource.url)
      .eq("created_by", user.id)
      .single()
    
    if (existingResource) {
      resourceId = existingResource.id
      // Update usage count if not already linked to this lesson
      if (!existingResourceIds.has(resourceId)) {
        await dbClient
          .from("resources")
          .update({ usage_count: dbClient.raw("usage_count + 1") })
          .eq("id", resourceId)
      }
    } else {
      // Create new resource
      // Extract S3 key from URL
      let s3Key: string | null = null
      if (resource.url.includes("s3.amazonaws.com") || resource.url.includes("cloudfront.net")) {
        try {
          const urlObj = new URL(resource.url)
          s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
        } catch (e) {
          // Invalid URL
        }
      }
      
      const { data: newResource, error: resourceError } = await dbClient
        .from("resources")
        .insert({
          title: resource.title || "Untitled Resource",
          description: resource.description || null,
          type: resource.type || "document",
          url: resource.url,
          file_size: resource.fileSize || null,
          s3_key: s3Key,
          created_by: user.id,
        })
        .select("id")
        .single()
      
      if (resourceError) {
        console.error(`Error creating resource:`, resourceError)
        continue
      }
      
      resourceId = newResource.id
    }
    
    currentResourceIds.add(resourceId)
    
    // Create or update lesson_resources junction
    const { error: junctionError } = await dbClient
      .from("lesson_resources")
      .upsert({
        lesson_id: actualLessonId,
        resource_id: resourceId,
        order_index: i,
      }, {
        onConflict: "lesson_id,resource_id"
      })
    
    if (junctionError) {
      console.error(`Error creating lesson_resource:`, junctionError)
    }
  }
  
  // Delete lesson_resources that are no longer in the lesson
  const resourcesToDelete = Array.from(existingResourceIds).filter(
    (id) => !currentResourceIds.has(id)
  )
  
  if (resourcesToDelete.length > 0) {
    await dbClient
      .from("lesson_resources")
      .delete()
      .eq("lesson_id", actualLessonId)
      .in("resource_id", resourcesToDelete)
    
    // Decrement usage_count for deleted resources
    for (const resourceId of resourcesToDelete) {
      await dbClient
        .from("resources")
        .update({ usage_count: dbClient.raw("GREATEST(usage_count - 1, 0)") })
        .eq("id", resourceId)
    }
  }
}

// Remove resources from lessonContent JSONB
const lessonContent = {
  ...(lesson.content || {}),
  // resources: lesson.resources || [], // REMOVED
  quiz: lesson.quiz || null,
  estimatedDuration: lesson.estimatedDuration || 0,
}
```

**Tasks**:
- [ ] Update `POST` handler in `/api/courses/drafts`
- [ ] Test resource creation
- [ ] Test resource updates
- [ ] Test resource deletion
- [ ] Test resource reuse across lessons

### Step 1.4: Update API Routes - Fetch Course

**File**: `apps/lms/app/api/courses/[id]/route.ts`

**Changes Needed**:
1. Fetch resources from `resources` table
2. Join with `lesson_resources` for ordering
3. Remove resources from JSONB parsing
4. Return resources in same format for backward compatibility

**Key Code Changes**:

```typescript
// In the lesson processing loop:
// Fetch resources for this lesson
const { data: lessonResources } = await supabase
  .from("lesson_resources")
  .select(`
    order_index,
    resources (
      id,
      title,
      description,
      type,
      url,
      file_size,
      mime_type,
      download_count
    )
  `)
  .eq("lesson_id", lesson.id)
  .order("order_index", { ascending: true })

// Transform to frontend format
const resources = (lessonResources || []).map((lr: any) => ({
  id: lr.resources.id.toString(),
  title: lr.resources.title,
  description: lr.resources.description,
  type: lr.resources.type,
  url: lr.resources.url,
  fileSize: lr.resources.file_size,
  downloadCount: lr.resources.download_count,
}))

// Fallback to JSONB if no resources in table (backward compatibility)
if (resources.length === 0 && content.resources) {
  resources = content.resources.map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    url: r.url,
    fileSize: r.fileSize,
  }))
}
```

**Tasks**:
- [ ] Update `GET` handler in `/api/courses/[id]`
- [ ] Test resource fetching
- [ ] Test backward compatibility (JSONB fallback)
- [ ] Verify resource ordering

### Step 1.5: Update Frontend Components

**Files to Update**:
- `apps/lms/app/admin/courses/new/components/LessonBuilder.tsx`
- `apps/lms/app/admin/courses/new/components/ResourceCard.tsx`
- `apps/lms/app/admin/courses/new/hooks/useAutoSave.ts`

**Changes Needed**:
1. No changes needed to frontend (API handles transformation)
2. Optional: Add resource library UI for reuse

**Tasks**:
- [ ] Verify frontend works with new API
- [ ] Test resource creation/editing/deletion
- [ ] Test resource display in learner view

### Step 1.6: Remove JSONB Resource Storage

**File**: `apps/lms/app/api/courses/drafts/route.ts`

**Changes**:
- Remove `resources` from `lessonContent` JSONB
- Update `transformDbToCourseData` to not read from JSONB

**Tasks**:
- [ ] Remove JSONB resource writes
- [ ] Remove JSONB resource reads (after migration verified)
- [ ] Test that resources still work

### Step 1.7: Testing & Validation

**Test Cases**:
1. ✅ Create new course with resources
2. ✅ Edit existing course, add/remove resources
3. ✅ Duplicate lesson with resources
4. ✅ Delete lesson with resources (should cascade)
5. ✅ Reuse same resource in multiple lessons
6. ✅ Verify resources display correctly in learner view
7. ✅ Verify resource downloads work
8. ✅ Test migration script on production-like data

**Tasks**:
- [ ] Run all test cases
- [ ] Fix any bugs
- [ ] Document edge cases
- [ ] Performance testing

### Step 1.8: Deploy

**Tasks**:
- [ ] Run migration on staging
- [ ] Verify staging works correctly
- [ ] Run migration on production
- [ ] Monitor for errors
- [ ] Verify production works correctly

---

## Phase 2: Quiz Settings Normalization

### Goal
Move quiz settings from JSONB (`lessons.content.quiz`) to dedicated `quiz_settings` table.

### Step 2.1: Create Database Migration

**File**: `apps/lms/supabase/migrations/005_create_quiz_settings_table.sql`

```sql
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

**Tasks**:
- [ ] Create migration file
- [ ] Test migration
- [ ] Verify constraints

### Step 2.2: Create Data Migration Script

**File**: `apps/lms/scripts/migrate-quiz-settings-from-jsonb.ts`

Similar structure to resources migration script.

**Tasks**:
- [ ] Create migration script
- [ ] Test on sample data
- [ ] Run on staging

### Step 2.3: Update API Routes

Similar to resources migration - update save and fetch routes.

**Tasks**:
- [ ] Update `/api/courses/drafts`
- [ ] Update `/api/courses/[id]`
- [ ] Test all quiz operations

### Step 2.4: Update Frontend

**Tasks**:
- [ ] Verify frontend works
- [ ] Test quiz settings UI

### Step 2.5: Remove JSONB Quiz Settings

**Tasks**:
- [ ] Remove from JSONB writes
- [ ] Remove from JSONB reads
- [ ] Test

---

## Phase 3: S3 Improvements

### Step 3.1: Implement S3 Cleanup

**File**: `apps/lms/lib/aws/s3-cleanup.ts`

```typescript
/**
 * Cleanup S3 files when course/lesson/resource is deleted
 */

export async function cleanupCourseFiles(courseId: number) {
  // 1. Get all S3 keys for this course
  // 2. Delete from S3
  // 3. Log cleanup
}

export async function cleanupLessonFiles(lessonId: number) {
  // Similar for lesson
}

export async function cleanupResourceFiles(resourceId: number) {
  // Similar for resource
}
```

**Tasks**:
- [ ] Create cleanup functions
- [ ] Integrate into DELETE routes
- [ ] Test cleanup
- [ ] Add error handling

### Step 3.2: Implement File Deduplication

**File**: `apps/lms/lib/aws/s3-deduplication.ts`

```typescript
/**
 * Check if file hash exists, reuse if found
 */

export async function getOrUploadFile(
  file: File,
  userId: string,
  type: string
): Promise<{ url: string; key: string; isNew: boolean }> {
  // 1. Calculate hash
  // 2. Check database for hash
  // 3. If exists, return existing URL
  // 4. If not, upload and store hash
}
```

**Tasks**:
- [ ] Add hash column to resources table
- [ ] Implement hash calculation
- [ ] Implement deduplication logic
- [ ] Test deduplication

### Step 3.3: Update S3 Path Structure

**Tasks**:
- [ ] Update `getS3StoragePath` function
- [ ] Migrate existing files (optional)
- [ ] Test new paths

---

## Phase 4: Data Fetching Standardization

### Step 4.1: Create Admin React Query Hooks

**File**: `apps/lms/lib/react-query/hooks/useAdminCourses.ts`

```typescript
export function useAdminCourses() {
  return useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const response = await fetch("/api/courses?all=true")
      if (!response.ok) throw new Error("Failed to fetch courses")
      return response.json()
    },
  })
}
```

**Tasks**:
- [ ] Create admin hooks
- [ ] Migrate admin pages
- [ ] Test

### Step 4.2: Implement Optimistic Updates

**Tasks**:
- [ ] Add optimistic updates to mutations
- [ ] Test rollback on error
- [ ] Test UI responsiveness

### Step 4.3: Implement Pagination

**Tasks**:
- [ ] Add pagination to API routes
- [ ] Add pagination UI
- [ ] Test with large datasets

### Step 4.4: Implement Lazy Loading

**Tasks**:
- [ ] Lazy load lesson content
- [ ] Test performance improvements

---

## Phase 5: Performance Optimizations

### Step 5.1: Database Indexes

**Tasks**:
- [ ] Add missing indexes
- [ ] Analyze query performance
- [ ] Optimize slow queries

### Step 5.2: Frontend Optimizations

**Tasks**:
- [ ] Code splitting
- [ ] Image optimization
- [ ] Bundle size analysis

### Step 5.3: API Optimizations

**Tasks**:
- [ ] Response compression
- [ ] Caching headers
- [ ] Rate limiting

---

## Testing Checklist

### Unit Tests
- [ ] Migration scripts
- [ ] API route handlers
- [ ] Utility functions

### Integration Tests
- [ ] Full course creation flow
- [ ] Resource management
- [ ] Quiz operations
- [ ] S3 operations

### E2E Tests
- [ ] Admin course builder
- [ ] Learner course view
- [ ] Resource downloads
- [ ] Quiz taking

### Performance Tests
- [ ] Page load times
- [ ] API response times
- [ ] Database query performance
- [ ] S3 upload/download speeds

---

## Rollout Strategy

1. **Staging Deployment**
   - Deploy Phase 1 (Resources)
   - Test thoroughly
   - Fix issues

2. **Production Deployment**
   - Deploy Phase 1
   - Monitor closely
   - Rollback plan ready

3. **Subsequent Phases**
   - Repeat for each phase
   - Gradual rollout

---

## Success Criteria

- ✅ All resources in normalized tables
- ✅ No JSONB for resources/quiz settings
- ✅ S3 cleanup working
- ✅ React Query used consistently
- ✅ Performance improved
- ✅ No data loss
- ✅ No breaking changes

---

**Document Version**: 1.0  
**Last Updated**: 2024
