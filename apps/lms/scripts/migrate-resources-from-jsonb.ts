/**
 * Migration script to move resources from JSONB to normalized tables
 * 
 * This script:
 * 1. Reads all lessons with resources in content JSONB
 * 2. Creates resource records (deduplicates by URL + user)
 * 3. Creates lesson_resources junction records
 * 4. Validates migration
 * 
 * NOTE: If you have no existing data, you don't need to run this script.
 * The new system will use normalized tables directly.
 * 
 * Run with: npx tsx scripts/migrate-resources-from-jsonb.ts
 * 
 * Make sure to set up your .env.local file with Supabase credentials first.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateResources() {
  console.log('Starting resources migration from JSONB to normalized tables...\n')
  
  // 1. Fetch all lessons with resources
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, content, course_id")
    .not("content", "is", null)
  
  if (lessonsError) {
    console.error("Error fetching lessons:", lessonsError)
    process.exit(1)
  }
  
  if (!lessons || lessons.length === 0) {
    console.log("No lessons found. Migration complete.")
    process.exit(0)
  }
  
  console.log(`Found ${lessons.length} lessons to process\n`)
  
  // 2. Process each lesson
  let resourcesCreated = 0
  let resourcesReused = 0
  let lessonResourcesCreated = 0
  let errors = 0
  const resourceUrlMap = new Map<string, number>() // URL + userId -> resource_id
  
  for (const lesson of lessons) {
    const content = lesson.content as any
    const resources = content?.resources || []
    
    if (!Array.isArray(resources) || resources.length === 0) {
      continue
    }
    
    // Get course creator (for created_by)
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("created_by")
      .eq("id", lesson.course_id)
      .single()
    
    if (courseError || !course) {
      console.warn(`⚠️  Course not found for lesson ${lesson.id}, skipping...`)
      continue
    }
    
    // Process each resource
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i]
      
      if (!resource.url) {
        console.warn(`⚠️  Resource in lesson ${lesson.id} has no URL, skipping...`)
        continue
      }
      
      const resourceKey = `${resource.url}-${course.created_by}`
      
      // Check if resource already exists in our map (from this migration run)
      let resourceId = resourceUrlMap.get(resourceKey)
      
      if (!resourceId) {
        // Check if resource already exists in database
        const { data: existingResource, error: checkError } = await supabase
          .from("resources")
          .select("id")
          .eq("url", resource.url)
          .eq("created_by", course.created_by)
          .single()
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error(`Error checking for existing resource:`, checkError)
          errors++
          continue
        }
        
        if (existingResource) {
          resourceId = existingResource.id
          resourcesReused++
          resourceUrlMap.set(resourceKey, resourceId)
        } else {
          // Extract S3 key from URL if it's an S3 URL
          let s3Key: string | null = null
          if (resource.url.includes("s3.amazonaws.com") || resource.url.includes("cloudfront.net")) {
            try {
              const urlObj = new URL(resource.url)
              s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
            } catch (e) {
              // Invalid URL, skip S3 key extraction
            }
          }
          
          // Create new resource
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
            console.error(`❌ Error creating resource for lesson ${lesson.id}:`, insertError)
            errors++
            continue
          }
          
          resourceId = newResource.id
          resourcesCreated++
          resourceUrlMap.set(resourceKey, resourceId)
        }
      }
      
      // Check if lesson_resources junction already exists
      const { data: existingJunction } = await supabase
        .from("lesson_resources")
        .select("id")
        .eq("lesson_id", lesson.id)
        .eq("resource_id", resourceId)
        .single()
      
      if (existingJunction) {
        // Update order_index if it changed
        await supabase
          .from("lesson_resources")
          .update({ order_index: i })
          .eq("id", existingJunction.id)
        continue
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
        console.error(`❌ Error creating lesson_resource for lesson ${lesson.id}:`, junctionError)
        errors++
        continue
      }
      
      lessonResourcesCreated++
    }
  }
  
  console.log(`\n✅ Migration complete:`)
  console.log(`   - Resources created: ${resourcesCreated}`)
  console.log(`   - Resources reused: ${resourcesReused}`)
  console.log(`   - Lesson-resource links created: ${lessonResourcesCreated}`)
  if (errors > 0) {
    console.log(`   - Errors encountered: ${errors}`)
  }
  
  // 3. Validate migration
  console.log(`\n🔍 Validating migration...`)
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
  
  const { data: migratedResources, error: countError } = await supabase
    .from("lesson_resources")
    .select("id", { count: "exact", head: true })
  
  const migratedCount = migratedResources || 0
  
  console.log(`   - Resources still in JSONB: ${jsonbResourcesCount}`)
  console.log(`   - Resources migrated: ${migratedCount}`)
  
  if (jsonbResourcesCount > 0) {
    console.warn(`\n⚠️  Some resources still exist in JSONB. Review before removing JSONB storage.`)
    console.warn(`   This is expected if you want to keep backward compatibility during transition.`)
  } else {
    console.log(`\n✅ All resources have been migrated!`)
  }
  
  if (errors > 0) {
    console.warn(`\n⚠️  Migration completed with ${errors} errors. Please review the logs above.`)
    process.exit(1)
  } else {
    console.log(`\n🎉 Migration completed successfully!`)
    process.exit(0)
  }
}

// Run migration
migrateResources()
  .catch((error) => {
    console.error("Migration script failed:", error)
    process.exit(1)
  })
