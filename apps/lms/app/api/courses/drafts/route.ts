import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Save or update a course draft
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client to bypass RLS for admin operations
    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      console.warn("Service role key not available, using regular client:", serviceError.message)
      serviceClient = null
    }

    // Check if user is admin or instructor (use service client to bypass RLS)
    const clientToUse = serviceClient || supabase
    const { data: profile } = await clientToUse
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { courseId, courseData, isPublished = false } = await request.json()

    if (!courseData) {
      return NextResponse.json({ error: "Course data is required" }, { status: 400 })
    }

    // Transform course data to match database schema
    // The schema uses flat columns, not a nested settings object
    const settings = courseData.settings || {}
    const enrollment = settings.enrollment || {}
    const certificate = settings.certificate || {}
    
    // Determine price - use enrollment price if available, otherwise basicInfo price
    const priceValue = enrollment.price !== undefined 
      ? enrollment.price 
      : (courseData.basicInfo?.price ? parseFloat(courseData.basicInfo.price) : null)
    
    const dbCourseData = {
      title: courseData.basicInfo?.title || "",
      description: courseData.basicInfo?.description || "",
      requirements: courseData.basicInfo?.requirements || null,
      who_is_this_for: courseData.basicInfo?.whoIsThisFor || null,
      image: courseData.basicInfo?.thumbnail && courseData.basicInfo.thumbnail.trim() !== "" 
        ? courseData.basicInfo.thumbnail.trim() 
        : null, // Schema uses 'image', not 'thumbnail'
      preview_video: courseData.basicInfo?.previewVideo && courseData.basicInfo.previewVideo.trim() !== "" 
        ? courseData.basicInfo.previewVideo.trim() 
        : null,
      price: priceValue,
      currency: settings.currency || "USD",
      is_published: isPublished || settings.isPublished || false,
      requires_sequential_progress: settings.requiresSequentialProgress !== undefined ? settings.requiresSequentialProgress : false,
      minimum_quiz_score: settings.minimumQuizScore !== undefined ? settings.minimumQuizScore : null,
      enrollment_mode: enrollment.enrollmentMode || "free",
      recurring_price: enrollment.recurringPrice !== undefined ? enrollment.recurringPrice : null,
      certificate_enabled: certificate.certificateEnabled || false,
      certificate_template: certificate.certificateTemplate || null,
      certificate_title: certificate.certificateTitle || null,
      certificate_description: certificate.certificateDescription || null,
      signature_image: certificate.signatureImage && certificate.signatureImage.trim() !== "" 
        ? certificate.signatureImage.trim() 
        : null,
      signature_title: certificate.signatureTitle || null,
      additional_text: certificate.additionalText || null,
      certificate_type: certificate.certificateType || null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }

    let result

    // Use service client for database operations to bypass RLS
    const dbClient = serviceClient || supabase

    if (courseId && courseId !== "new") {
      // Update existing course
      const { data, error } = await dbClient
        .from("courses")
        .update(dbCourseData)
        .eq("id", courseId)
        .eq("created_by", user.id) // Ensure user owns the course
        .select()
        .single()

      if (error) {
        console.error("Error updating course draft:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    } else {
      // Create new course draft
      const { data, error } = await dbClient
        .from("courses")
        .insert({
          ...dbCourseData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating course draft:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    }

    // Save lessons if provided
    if (courseData.lessons && Array.isArray(courseData.lessons) && result.id) {
      // Get existing lessons from database to track which ones to delete
      const { data: existingLessons } = await dbClient
        .from("lessons")
        .select("id")
        .eq("course_id", result.id)

      const existingLessonIds = new Set((existingLessons || []).map((l: any) => l.id?.toString()))

      // Separate lessons into updates and inserts
      const lessonsToUpdate: any[] = []
      const lessonsToInsert: any[] = []
      const currentLessonIds = new Set<string>()

      courseData.lessons.forEach((lesson: any, index: number) => {
        // Extract all data from content and save to dedicated columns (NO JSONB)
        const videoUrl = lesson.content?.url && typeof lesson.content.url === 'string' && lesson.content.url.trim() !== ''
          ? lesson.content.url.trim()
          : null

        // Extract text/html content
        const textContent = (lesson.content?.html && lesson.content.html.trim() !== '') 
          ? lesson.content.html.trim()
          : ((lesson.content?.text && lesson.content.text.trim() !== '') 
            ? lesson.content.text.trim() 
            : null)

        // Extract estimated duration
        const estimatedDuration = lesson.estimatedDuration || lesson.content?.estimatedDuration || 0

        // Extract settings fields to match schema
        const settings = lesson.settings || {}
        
        const lessonData = {
          course_id: result.id,
          title: lesson.title || "",
          type: lesson.type || "text",
          video_url: videoUrl, // Video URL in dedicated column
          text_content: textContent, // Text/HTML content in dedicated column
          estimated_duration: estimatedDuration, // Duration in dedicated column
          content: null, // No longer using content JSONB - set to null
          order_index: index,
          is_required: settings.isRequired !== undefined ? settings.isRequired : true,
          video_progression: settings.videoProgression !== undefined ? settings.videoProgression : false,
        }

        // Check if lesson has a real database ID (numeric, not temporary like "lesson-123456-abc")
        const lessonId = lesson.id?.toString()
        // Real database IDs are numeric strings, temporary IDs start with "lesson-" and contain non-numeric characters
        const isRealDatabaseId = lessonId && 
          !lessonId.startsWith("lesson-") && 
          !isNaN(Number(lessonId)) && 
          Number(lessonId) > 0

        if (isRealDatabaseId && existingLessonIds.has(lessonId)) {
          // Update existing lesson
          lessonsToUpdate.push({
            id: Number(lessonId),
            ...lessonData,
          })
          currentLessonIds.add(lessonId)
        } else {
          // Insert new lesson
          lessonsToInsert.push(lessonData)
        }
      })

      // Update existing lessons
      if (lessonsToUpdate.length > 0) {
        for (const lessonUpdate of lessonsToUpdate) {
          const { id, ...updateData } = lessonUpdate
          const { error: updateError } = await dbClient
            .from("lessons")
            .update(updateData)
            .eq("id", id)

          if (updateError) {
            console.error(`Error updating lesson ${id}:`, updateError)
          }
        }
        console.log(`Successfully updated ${lessonsToUpdate.length} lessons for course ${result.id}`)
      }

      // Insert new lessons
      let insertedLessonIds: number[] = []
      if (lessonsToInsert.length > 0) {
        const { data: insertedLessons, error: insertError } = await dbClient
          .from("lessons")
          .insert(lessonsToInsert)
          .select("id")

        if (insertError) {
          console.error("Error inserting new lessons:", insertError)
        } else {
          insertedLessonIds = (insertedLessons || []).map((l: any) => l.id)
          console.log(`Successfully inserted ${insertedLessonIds.length} new lessons for course ${result.id}`)
        }
      }

      // Delete lessons that exist in database but not in current lessons array
      const lessonsToDelete = Array.from(existingLessonIds).filter(id => !currentLessonIds.has(id))
      if (lessonsToDelete.length > 0) {
        const { error: deleteError } = await dbClient
          .from("lessons")
          .delete()
          .in("id", lessonsToDelete.map(id => Number(id)))

        if (deleteError) {
          console.error("Error deleting removed lessons:", deleteError)
        } else {
          console.log(`Successfully deleted ${lessonsToDelete.length} removed lessons for course ${result.id}`)
        }
      }

      // Save quiz questions to quiz_questions table
      // Create a mapping from lesson index to database ID
      const lessonIdMap = new Map<number, number>()
      
      // Map updated lessons
      lessonsToUpdate.forEach((lesson: any) => {
        const lessonIndex = courseData.lessons.findIndex((l: any) => {
          const lId = l.id?.toString()
          return lId && !lId.startsWith("lesson-") && Number(lId) === lesson.id
        })
        if (lessonIndex >= 0) {
          lessonIdMap.set(lessonIndex, lesson.id)
        }
      })

      // Map inserted lessons (match by order)
      let insertedIndex = 0
      courseData.lessons.forEach((lesson: any, index: number) => {
        const lId = lesson.id?.toString()
        const isNewLesson = lId && lId.startsWith("lesson-")
        if (isNewLesson && insertedIndex < insertedLessonIds.length) {
          lessonIdMap.set(index, insertedLessonIds[insertedIndex])
          insertedIndex++
        }
      })

      // Process quiz questions for each lesson
      for (let lessonIndex = 0; lessonIndex < courseData.lessons.length; lessonIndex++) {
        const lesson = courseData.lessons[lessonIndex]
        const actualLessonId = lessonIdMap.get(lessonIndex)
        
        if (!actualLessonId) {
          // If we can't find the lesson ID, skip question processing
          continue
        }

        // Get existing questions for this lesson
        const { data: existingQuestions } = await dbClient
          .from("quiz_questions")
          .select("id")
          .eq("lesson_id", actualLessonId)

        const existingQuestionIds = new Set((existingQuestions || []).map((q: any) => q.id))

        // Extract quiz questions and settings from lesson data
        const quiz = lesson.quiz
        const hasQuestions = quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0
        const quizEnabled = quiz && quiz.enabled && hasQuestions

        // Save or update quiz settings
        const quizSettingsData = {
          lesson_id: actualLessonId,
          enabled: quizEnabled || false,
          shuffle_quiz: quiz?.shuffleQuiz || false,
          max_attempts: quiz?.maxAttempts || 3,
          show_correct_answers: quiz?.showCorrectAnswers !== undefined ? quiz.showCorrectAnswers : true,
          allow_multiple_attempts: quiz?.allowMultipleAttempts !== undefined ? quiz.allowMultipleAttempts : true,
          time_limit: quiz?.timeLimit || null,
          passing_score: quiz?.passingScore || null,
          updated_at: new Date().toISOString(),
        }

        // Upsert quiz settings
        const { error: settingsError } = await dbClient
          .from("quiz_settings")
          .upsert(quizSettingsData, {
            onConflict: "lesson_id"
          })

        if (settingsError) {
          console.error(`Error saving quiz settings for lesson ${actualLessonId}:`, settingsError)
        }

        if (!hasQuestions) {
          // If no questions, delete existing questions and disable quiz
          if (existingQuestionIds.size > 0) {
            await dbClient
              .from("quiz_questions")
              .delete()
              .eq("lesson_id", actualLessonId)
          }
          // Update settings to disabled
          await dbClient
            .from("quiz_settings")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("lesson_id", actualLessonId)
          continue
        }

        // Prepare questions to insert
        const questionsToInsert: any[] = []

        quiz.questions.forEach((question: any, index: number) => {
          // Extract question data based on type
          const questionData: any = {}
          
          if (question.type === "multiple-choice") {
            questionData.options = question.options || []
            questionData.correctOption = question.correctOption ?? 0
            questionData.allowMultipleCorrect = question.allowMultipleCorrect || false
            questionData.partialCredit = question.partialCredit || false
          } else if (question.type === "true-false") {
            questionData.correctAnswer = question.correctAnswer ?? true
          } else if (question.type === "fill-blank") {
            questionData.correctAnswers = question.correctAnswers || []
            questionData.caseSensitive = question.caseSensitive || false
          } else if (question.type === "short-answer") {
            questionData.correctKeywords = question.correctKeywords || []
            questionData.caseSensitive = question.caseSensitive || false
          } else if (question.type === "essay") {
            questionData.wordLimit = question.wordLimit
            questionData.rubric = question.rubric
          } else if (question.type === "matching") {
            questionData.leftItems = question.leftItems || []
            questionData.rightItems = question.rightItems || []
            questionData.correctMatches = question.correctMatches || []
          }

          const questionRecord = {
            lesson_id: actualLessonId,
            question_type: question.type || "multiple-choice",
            question_text: question.text || "",
            question_data: questionData,
            points: question.points ?? 1,
            explanation: question.explanation || null,
            difficulty: question.difficulty || null,
            time_limit: question.timeLimit || null,
            image_url: question.imageUrl && question.imageUrl.trim() !== "" 
              ? question.imageUrl.trim() 
              : null,
            order_index: index,
          }

          // Check if question has a database ID (from quiz_questions table)
          // Question IDs from frontend are temporary strings, so we always insert new
          // unless we can match by some criteria (for now, we'll insert new and clean up old)
          questionsToInsert.push(questionRecord)
        })

        // Delete existing questions for this lesson (we'll recreate them)
        if (existingQuestionIds.size > 0) {
          const { error: deleteError } = await dbClient
            .from("quiz_questions")
            .delete()
            .eq("lesson_id", actualLessonId)

          if (deleteError) {
            console.error(`Error deleting questions for lesson ${actualLessonId}:`, deleteError)
          }
        }

        // Insert new questions
        if (questionsToInsert.length > 0) {
          const { error: insertError } = await dbClient
            .from("quiz_questions")
            .insert(questionsToInsert)

          if (insertError) {
            console.error(`Error inserting questions for lesson ${actualLessonId}:`, insertError)
          } else {
            console.log(`Successfully saved ${questionsToInsert.length} questions for lesson ${actualLessonId}`)
          }
        }
      }

      // Process resources for each lesson
      for (let lessonIndex = 0; lessonIndex < courseData.lessons.length; lessonIndex++) {
        const lesson = courseData.lessons[lessonIndex]
        const actualLessonId = lessonIdMap.get(lessonIndex)
        
        if (!actualLessonId) {
          // If we can't find the lesson ID, skip resource processing
          continue
        }

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
          
          if (!resource.url) {
            console.warn(`Resource in lesson ${actualLessonId} has no URL, skipping...`)
            continue
          }

          // Check if resource already exists (by URL + user)
          let resourceId: number | null = null
          
          const { data: existingResource, error: checkError } = await dbClient
            .from("resources")
            .select("id")
            .eq("url", resource.url)
            .eq("created_by", user.id)
            .single()

          if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error(`Error checking for existing resource:`, checkError)
            continue
          }

          if (existingResource) {
            resourceId = existingResource.id
            // Update usage count if not already linked to this lesson
            if (!existingResourceIds.has(resourceId)) {
              // Get current usage count and increment
              const { data: currentResource } = await dbClient
                .from("resources")
                .select("usage_count")
                .eq("id", resourceId)
                .single()
              
              if (currentResource) {
                await dbClient
                  .from("resources")
                  .update({ usage_count: (currentResource.usage_count || 0) + 1 })
                  .eq("id", resourceId)
              }
            }
          } else {
            // Create new resource
            // Extract S3 key from URL
            let s3Key: string | null = null
            let fileHash: string | null = null
            
            if (resource.url.includes("s3.amazonaws.com") || resource.url.includes("cloudfront.net")) {
              try {
                const urlObj = new URL(resource.url)
                s3Key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
              } catch (e) {
                // Invalid URL, skip S3 key extraction
              }
            }
            
            // If resource has a hash (from deduplication), store it
            if (resource.fileHash) {
              fileHash = resource.fileHash
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
                file_hash: fileHash,
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
            // Get current usage count and decrement
            const { data: currentResource } = await dbClient
              .from("resources")
              .select("usage_count")
              .eq("id", resourceId)
              .single()
            
            if (currentResource) {
              const newUsageCount = Math.max((currentResource.usage_count || 0) - 1, 0)
              await dbClient
                .from("resources")
                .update({ usage_count: newUsageCount })
                .eq("id", resourceId)
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      course: result,
      courseId: result.id 
    })
  } catch (error: any) {
    console.error("Unexpected error saving draft:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while saving draft" },
      { status: 500 }
    )
  }
}

// Get draft by course ID
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client to bypass RLS for admin operations
    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    let serviceClient
    try {
      serviceClient = createServiceRoleClient()
    } catch (serviceError: any) {
      console.warn("Service role key not available, using regular client:", serviceError.message)
      serviceClient = null
    }

    // Check if user is admin or instructor (use service client to bypass RLS)
    const clientToUse = serviceClient || supabase
    const { data: profile } = await clientToUse
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin" && profile?.user_type !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Use service client for database operations to bypass RLS
    const dbClient = serviceClient || supabase
    const { data, error } = await dbClient
      .from("courses")
      .select(`
        *,
        lessons (*)
      `)
      .eq("id", courseId)
      .eq("created_by", user.id) // Ensure user owns the course
      .single()

    if (error) {
      console.error("Error fetching course draft:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Transform lessons from database schema to frontend format
    if (data.lessons && Array.isArray(data.lessons)) {
      // Fetch resources, quiz settings, and quiz questions for all lessons in parallel
      const lessonIds = data.lessons.map((l: any) => l.id)
      const [allLessonResources, allQuizSettings, allQuizQuestions] = await Promise.all([
        dbClient
          .from("lesson_resources")
          .select(`
            lesson_id,
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
          .in("lesson_id", lessonIds)
          .order("order_index", { ascending: true }),
        dbClient
          .from("quiz_settings")
          .select("*")
          .in("lesson_id", lessonIds),
        dbClient
          .from("quiz_questions")
          .select("*")
          .in("lesson_id", lessonIds)
          .order("order_index", { ascending: true })
      ])

      // Group resources by lesson_id
      const resourcesByLesson = new Map<number, any[]>()
      if (allLessonResources.data) {
        for (const lr of allLessonResources.data) {
          if (!lr.lesson_id || !lr.resources) continue
          if (!resourcesByLesson.has(lr.lesson_id)) {
            resourcesByLesson.set(lr.lesson_id, [])
          }
          resourcesByLesson.get(lr.lesson_id)!.push({
            id: lr.resources.id.toString(),
            title: lr.resources.title,
            description: lr.resources.description,
            type: lr.resources.type,
            url: lr.resources.url,
            fileSize: lr.resources.file_size,
            downloadCount: lr.resources.download_count,
          })
        }
      }

      // Group quiz settings and questions by lesson_id
      const quizSettingsByLesson = new Map<number, any>()
      if (allQuizSettings.data) {
        for (const settings of allQuizSettings.data) {
          quizSettingsByLesson.set(settings.lesson_id, {
            enabled: settings.enabled || false,
            shuffleQuiz: settings.shuffle_quiz || false,
            maxAttempts: settings.max_attempts || 3,
            showCorrectAnswers: settings.show_correct_answers !== undefined ? settings.show_correct_answers : true,
            allowMultipleAttempts: settings.allow_multiple_attempts !== undefined ? settings.allow_multiple_attempts : true,
            timeLimit: settings.time_limit || null,
            passingScore: settings.passing_score || null,
          })
        }
      }

      // Group quiz questions by lesson_id and transform to frontend format
      const quizQuestionsByLesson = new Map<number, any[]>()
      if (allQuizQuestions.data) {
        for (const q of allQuizQuestions.data) {
          if (!quizQuestionsByLesson.has(q.lesson_id)) {
            quizQuestionsByLesson.set(q.lesson_id, [])
          }
          
          const questionData = q.question_data || {}
          const question: any = {
            id: q.id.toString(),
            type: q.question_type || "multiple-choice",
            text: q.question_text || "",
            points: q.points || 1,
            explanation: q.explanation || null,
            difficulty: q.difficulty || null,
            timeLimit: q.time_limit || null,
            imageUrl: q.image_url || null,
            ...questionData, // Include type-specific data
          }
          
          quizQuestionsByLesson.get(q.lesson_id)!.push(question)
        }
      }

      data.lessons = data.lessons.map((lesson: any) => {
        const settings = {
          isRequired: lesson.is_required !== undefined ? lesson.is_required : true,
          videoProgression: lesson.video_progression !== undefined ? lesson.video_progression : false,
        }

        // Get all data from dedicated columns (NO JSONB content)
        const videoUrl = lesson.video_url && lesson.video_url.trim() !== '' 
          ? lesson.video_url.trim() 
          : null

        const textContent = lesson.text_content && lesson.text_content.trim() !== ''
          ? lesson.text_content.trim()
          : null

        const estimatedDuration = lesson.estimated_duration || 0

        // Get resources, quiz settings, and quiz questions from normalized tables
        const resources = resourcesByLesson.get(lesson.id) || []
        const quizSettings = quizSettingsByLesson.get(lesson.id)
        const quizQuestions = quizQuestionsByLesson.get(lesson.id) || []

        // Combine quiz settings and questions into quiz object
        const quiz = quizSettings ? {
          ...quizSettings,
          questions: quizQuestions,
        } : null

        // Build content object for frontend compatibility (but data comes from columns)
        const content: any = {}
        if (videoUrl) content.url = videoUrl
        if (textContent) {
          content.html = textContent
          content.text = textContent
        }

        return {
          id: lesson.id?.toString() || `lesson-${Date.now()}`,
          title: lesson.title || "",
          type: lesson.type || "text",
          content: content, // Built from dedicated columns, not JSONB
          resources: resources,
          settings: settings,
          quiz: quiz,
          estimatedDuration: estimatedDuration,
        }
      })
    }

    return NextResponse.json({ course: data })
  } catch (error: any) {
    console.error("Unexpected error fetching draft:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while fetching draft" },
      { status: 500 }
    )
  }
}

