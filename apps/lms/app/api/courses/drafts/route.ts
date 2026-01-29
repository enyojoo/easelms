import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

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
      logWarning("Service role key not available, using regular client", {
        component: "courses/drafts/route",
        action: "POST",
        error: serviceError.message,
      })
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

    const { courseId, courseData, isPublished } = await request.json()

    if (!courseData) {
      return NextResponse.json({ error: "Course data is required" }, { status: 400 })
    }

    // Transform course data to match database schema
    // The schema uses flat columns, not a nested settings object
    const settings = courseData.settings || {}
    const enrollment = settings.enrollment || {}
    const certificate = settings.certificate || {}
    const prerequisites = settings.prerequisites || { enabled: false, courseIds: [] }
    const instructor = settings.instructor || { instructorEnabled: false, instructorIds: [] }
    
    // Determine price - use enrollment price if available, otherwise basicInfo price
    const priceValue = enrollment.price !== undefined 
      ? enrollment.price 
      : (courseData.basicInfo?.price ? parseFloat(courseData.basicInfo.price) : null)
    
    // Prioritize isPublished parameter from request (for draft/publish buttons)
    // If not provided, fall back to settings.isPublished, then default to false
    const finalIsPublished = isPublished !== undefined 
      ? isPublished 
      : (settings.isPublished !== undefined ? settings.isPublished : false)
    
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
      is_published: finalIsPublished,
      requires_sequential_progress: settings.requiresSequentialProgress !== undefined ? settings.requiresSequentialProgress : false,
      minimum_quiz_score: settings.minimumQuizScore !== undefined ? settings.minimumQuizScore : null,
      enrollment_mode: enrollment.enrollmentMode || "free",
      certificate_enabled: certificate.certificateEnabled || false,
      certificate_template: certificate.certificateTemplate || null,
      certificate_title: certificate.certificateTitle || null,
      certificate_description: certificate.certificateDescription || null,
      signature_image: certificate.signatureImage && certificate.signatureImage.trim() !== "" 
        ? certificate.signatureImage.trim() 
        : null,
      signature_name: certificate.signatureName && certificate.signatureName.trim() !== "" 
        ? certificate.signatureName.trim() 
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
        logError("Error updating course draft", error, {
          component: "courses/drafts/route",
          action: "POST",
          courseId,
          userId: user.id,
        })
        return NextResponse.json(createErrorResponse(error, 500, { courseId, userId: user.id }), { status: 500 })
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
        logError("Error creating course draft", error, {
          component: "courses/drafts/route",
          action: "POST",
          userId: user.id,
        })
        return NextResponse.json(createErrorResponse(error, 500, { userId: user.id }), { status: 500 })
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
            logError(`Error updating lesson ${id}`, updateError, {
              component: "courses/drafts/route",
              action: "POST",
              lessonId: id,
              courseId: result.id,
            })
          }
        }
        logInfo(`Successfully updated ${lessonsToUpdate.length} lessons`, { courseId: result.id })
      }

      // Insert new lessons
      let insertedLessonIds: number[] = []
      if (lessonsToInsert.length > 0) {
        const { data: insertedLessons, error: insertError } = await dbClient
          .from("lessons")
          .insert(lessonsToInsert)
          .select("id")

        if (insertError) {
          logError("Error inserting new lessons", insertError, {
            component: "courses/drafts/route",
            action: "POST",
            courseId: result.id,
          })
        } else {
          insertedLessonIds = (insertedLessons || []).map((l: any) => l.id)
          logInfo(`Successfully inserted ${insertedLessonIds.length} new lessons`, { courseId: result.id })
        }
      }

      // Delete lessons that exist in database but not in current lessons array
      const lessonsToDelete = Array.from(existingLessonIds).filter(id => !currentLessonIds.has(id))
      
      logInfo(`Lesson deletion check for course ${result.id}`, {
        existingLessonIds: Array.from(existingLessonIds),
        currentLessonIds: Array.from(currentLessonIds),
        lessonsToDelete: lessonsToDelete,
      })
      
      if (lessonsToDelete.length > 0) {
        // First, delete all related data for these lessons (quiz questions, quiz settings, resources, etc.)
        const lessonIdsToDelete = lessonsToDelete.map(id => Number(id))
        
        // Delete quiz questions for deleted lessons
        const { error: quizQuestionsDeleteError } = await dbClient
          .from("quiz_questions")
          .delete()
          .in("lesson_id", lessonIdsToDelete)
        
        if (quizQuestionsDeleteError) {
          logError("Error deleting quiz questions for removed lessons", quizQuestionsDeleteError, {
            component: "courses/drafts/route",
            action: "POST",
            courseId: result.id,
            lessonIds: lessonIdsToDelete,
          })
        } else {
          logInfo(`Deleted quiz questions for ${lessonsToDelete.length} removed lessons`, { courseId: result.id })
        }
        
        // Delete quiz settings for deleted lessons
        const { error: quizSettingsDeleteError } = await dbClient
          .from("quiz_settings")
          .delete()
          .in("lesson_id", lessonIdsToDelete)
        
        if (quizSettingsDeleteError) {
          logError("Error deleting quiz settings for removed lessons", quizSettingsDeleteError, {
            component: "courses/drafts/route",
            action: "POST",
            courseId: result.id,
            lessonIds: lessonIdsToDelete,
          })
        }
        
        // Delete lesson_resources for deleted lessons
        const { error: lessonResourcesDeleteError } = await dbClient
          .from("lesson_resources")
          .delete()
          .in("lesson_id", lessonIdsToDelete)
        
        if (lessonResourcesDeleteError) {
          logError("Error deleting lesson_resources for removed lessons", lessonResourcesDeleteError, {
            component: "courses/drafts/route",
            action: "POST",
            courseId: result.id,
            lessonIds: lessonIdsToDelete,
          })
        }
        
        // Finally, delete the lessons themselves
        const { error: deleteError } = await dbClient
          .from("lessons")
          .delete()
          .in("id", lessonIdsToDelete)

        if (deleteError) {
          logError("Error deleting removed lessons", deleteError, {
            component: "courses/drafts/route",
            action: "POST",
            courseId: result.id,
            lessonIds: lessonsToDelete,
          })
        } else {
          logInfo(`Successfully deleted ${lessonsToDelete.length} removed lessons`, {
            courseId: result.id,
            deletedLessonIds: lessonsToDelete,
          })
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
        // Quiz is enabled only if: quiz exists, enabled is true, AND has questions
        const quizEnabled = quiz && quiz.enabled === true && hasQuestions
        
        logInfo(`Processing quiz for lesson ${actualLessonId}`, {
          hasQuiz: !!quiz,
          quizEnabled: quiz?.enabled,
          hasQuestions: hasQuestions,
          questionsCount: quiz?.questions?.length || 0,
          finalQuizEnabled: quizEnabled,
        })

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
          logError(`Error saving quiz settings for lesson ${actualLessonId}`, settingsError, {
            component: "courses/drafts/route",
            action: "POST",
            lessonId: actualLessonId,
          })
        }

        // If quiz has no questions, we still need to save settings (but keep existing questions)
        // Only delete questions if they're explicitly removed from the array, not when quiz is disabled
        if (!hasQuestions) {
          // Update settings to disabled (but keep questions in database)
          await dbClient
            .from("quiz_settings")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("lesson_id", actualLessonId)
          
          // If there are no questions in the array but there are questions in DB,
          // we should still process deletions below (questions were explicitly removed)
          // But if quiz is just disabled (hasQuestions = false but questions exist in DB),
          // we should NOT delete them - just continue to save settings
          if (existingQuestionIds.size === 0) {
            // No questions in DB and no questions in array - nothing to do
            continue
          }
          // Otherwise, continue to deletion logic below to handle explicitly removed questions
        }

        // Separate questions into updates and inserts
        const questionsToUpdate: any[] = []
        const questionsToInsert: any[] = []
        const currentQuestionIds = new Set<number>()

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

          // Check if question has a real database ID (numeric, not temporary like "q-123456-abc")
          const questionId = question.id?.toString()
          // Real database IDs are numeric strings, temporary IDs start with "q-" or contain non-numeric characters
          const isRealDatabaseId = questionId && 
            !questionId.startsWith("q-") && 
            !isNaN(Number(questionId)) && 
            Number(questionId) > 0 &&
            existingQuestionIds.has(Number(questionId))

          if (isRealDatabaseId) {
            // Update existing question
            questionsToUpdate.push({
              id: Number(questionId),
              ...questionRecord,
            })
            currentQuestionIds.add(Number(questionId))
          } else {
            // Insert new question
            questionsToInsert.push(questionRecord)
          }
        })

        // Update existing questions
        if (questionsToUpdate.length > 0) {
          for (const questionUpdate of questionsToUpdate) {
            const { id, ...updateData } = questionUpdate
            const { error: updateError } = await dbClient
              .from("quiz_questions")
              .update(updateData)
              .eq("id", id)

            if (updateError) {
              logError(`Error updating question ${id}`, updateError, {
                component: "courses/drafts/route",
                action: "POST",
                questionId: id,
                lessonId: actualLessonId,
              })
            }
          }
          logInfo(`Successfully updated ${questionsToUpdate.length} questions`, { lessonId: actualLessonId })
        }

        // Insert new questions
        if (questionsToInsert.length > 0) {
          const { error: insertError } = await dbClient
            .from("quiz_questions")
            .insert(questionsToInsert)

          if (insertError) {
            logError(`Error inserting questions for lesson ${actualLessonId}`, insertError, {
              component: "courses/drafts/route",
              action: "POST",
              lessonId: actualLessonId,
            })
          } else {
            logInfo(`Successfully inserted ${questionsToInsert.length} new questions`, { lessonId: actualLessonId })
          }
        }

        // Delete questions that exist in database but not in current questions array
        // This handles the case where questions are deleted from the UI
        const questionsToDelete = Array.from(existingQuestionIds).filter(id => !currentQuestionIds.has(id))
        
        logInfo(`Quiz deletion check for lesson ${actualLessonId}`, {
          existingQuestionIds: Array.from(existingQuestionIds),
          currentQuestionIds: Array.from(currentQuestionIds),
          questionsToDelete: questionsToDelete,
          questionsInArray: quiz.questions.map((q: any) => ({
            id: q.id,
            idType: typeof q.id,
            isRealId: q.id && !q.id.toString().startsWith("q-") && !isNaN(Number(q.id)),
            numericId: q.id && !isNaN(Number(q.id)) ? Number(q.id) : null,
          })),
        })
        
        if (questionsToDelete.length > 0) {
          const { error: deleteError } = await dbClient
            .from("quiz_questions")
            .delete()
            .eq("lesson_id", actualLessonId)
            .in("id", questionsToDelete)

          if (deleteError) {
            logError(`Error deleting removed questions for lesson ${actualLessonId}`, deleteError, {
              component: "courses/drafts/route",
              action: "POST",
              lessonId: actualLessonId,
              deletedIds: questionsToDelete,
            })
          } else {
            logInfo(`Successfully deleted ${questionsToDelete.length} removed questions`, {
              lessonId: actualLessonId,
              deletedIds: questionsToDelete,
            })
          }
        } else if (existingQuestionIds.size > 0 && currentQuestionIds.size === 0 && quiz.questions.length > 0) {
          // Edge case: All questions in array are new (no database IDs), but there are existing questions in DB
          // This means all existing questions should be deleted and replaced with new ones
          logWarning(`Lesson ${actualLessonId} has ${existingQuestionIds.size} questions in DB but none match current questions array - deleting all existing questions`, {
            component: "courses/drafts/route",
            action: "POST",
            lessonId: actualLessonId,
            existingIds: Array.from(existingQuestionIds),
            currentQuestions: quiz.questions.map((q: any) => q.id),
          })
          
          // Delete all existing questions since they don't match
          const { error: deleteAllError } = await dbClient
            .from("quiz_questions")
            .delete()
            .eq("lesson_id", actualLessonId)
            
          if (deleteAllError) {
            logError(`Error deleting all unmatched questions for lesson ${actualLessonId}`, deleteAllError, {
              component: "courses/drafts/route",
              action: "POST",
              lessonId: actualLessonId,
            })
          } else {
            logInfo(`Deleted all ${existingQuestionIds.size} unmatched questions`, { lessonId: actualLessonId })
          }
        } else if (existingQuestionIds.size > 0 && quiz.questions.length === 0) {
          // All questions were deleted from UI - delete all from DB
          logInfo(`All questions deleted from UI for lesson ${actualLessonId} - deleting all from database`, { lessonId: actualLessonId })
          const { error: deleteAllError } = await dbClient
            .from("quiz_questions")
            .delete()
            .eq("lesson_id", actualLessonId)
            
          if (deleteAllError) {
            logError(`Error deleting all questions for lesson ${actualLessonId}`, deleteAllError, {
              component: "courses/drafts/route",
              action: "POST",
              lessonId: actualLessonId,
            })
          } else {
            logInfo(`Successfully deleted all ${existingQuestionIds.size} questions`, { lessonId: actualLessonId })
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
            logWarning(`Resource in lesson ${actualLessonId} has no URL, skipping`, {
              component: "courses/drafts/route",
              action: "POST",
              lessonId: actualLessonId,
            })
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
            logError(`Error checking for existing resource`, checkError, {
              component: "courses/drafts/route",
              action: "POST",
              lessonId: actualLessonId,
              resourceUrl: resource.url,
            })
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
              logError(`Error creating resource`, resourceError, {
                component: "courses/drafts/route",
                action: "POST",
                lessonId: actualLessonId,
                resourceTitle: resource.title,
              })
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
            logError(`Error creating lesson_resource`, junctionError, {
              component: "courses/drafts/route",
              action: "POST",
              lessonId: actualLessonId,
              resourceId: resourceId,
            })
          }
        }

        // Delete lesson_resources that are no longer in the lesson
        const resourcesToDelete = Array.from(existingResourceIds).filter(
          (id) => !currentResourceIds.has(id)
        )

        logInfo(`Resource deletion check for lesson ${actualLessonId}`, {
          existingResourceIds: Array.from(existingResourceIds),
          currentResourceIds: Array.from(currentResourceIds),
          resourcesToDelete: resourcesToDelete,
          resourcesInArray: resources.map((r: any) => ({
            id: r.id,
            url: r.url,
          })),
        })

        if (resourcesToDelete.length > 0) {
          const { error: deleteError } = await dbClient
            .from("lesson_resources")
            .delete()
            .eq("lesson_id", actualLessonId)
            .in("resource_id", resourcesToDelete)

          if (deleteError) {
            logError(`Error deleting lesson_resources for lesson ${actualLessonId}`, deleteError, {
              component: "courses/drafts/route",
              action: "POST",
              lessonId: actualLessonId,
            })
          } else {
            logInfo(`Successfully deleted ${resourcesToDelete.length} lesson_resources`, {
              lessonId: actualLessonId,
              deletedResourceIds: resourcesToDelete,
            })
          }

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
              const { error: updateError } = await dbClient
                .from("resources")
                .update({ usage_count: newUsageCount })
                .eq("id", resourceId)
              
              if (updateError) {
                logError(`Error updating usage_count for resource ${resourceId}`, updateError, {
                  component: "courses/drafts/route",
                  action: "POST",
                  resourceId: resourceId,
                })
              }
            }
          }
        }
      }

      // Save prerequisites
      if (result.id && prerequisites.enabled && Array.isArray(prerequisites.courseIds)) {
        // Get existing prerequisites
        const { data: existingPrerequisites } = await dbClient
          .from("course_prerequisites")
          .select("prerequisite_course_id")
          .eq("course_id", result.id)

        const existingPrerequisiteIds = new Set(
          (existingPrerequisites || []).map((p: any) => p.prerequisite_course_id)
        )

        const currentPrerequisiteIds = new Set(prerequisites.courseIds)

        // Delete removed prerequisites
        const prerequisitesToDelete = Array.from(existingPrerequisiteIds).filter(
          (id) => !currentPrerequisiteIds.has(id)
        )
        if (prerequisitesToDelete.length > 0) {
          const { error: deleteError } = await dbClient
            .from("course_prerequisites")
            .delete()
            .eq("course_id", result.id)
            .in("prerequisite_course_id", prerequisitesToDelete)

          if (deleteError) {
            logError("Error deleting prerequisites", deleteError, {
              component: "courses/drafts/route",
              action: "POST",
              courseId: result.id,
            })
          }
        }

        // Insert new prerequisites
        const prerequisitesToInsert = prerequisites.courseIds
          .filter((id) => !existingPrerequisiteIds.has(id))
          .map((prerequisiteCourseId) => ({
            course_id: result.id,
            prerequisite_course_id: prerequisiteCourseId,
          }))

        if (prerequisitesToInsert.length > 0) {
          const { error: insertError } = await dbClient
            .from("course_prerequisites")
            .insert(prerequisitesToInsert)

          if (insertError) {
            logError("Error inserting prerequisites", insertError, {
              component: "courses/drafts/route",
              action: "POST",
              courseId: result.id,
            })
          } else {
            logInfo(`Successfully saved ${prerequisitesToInsert.length} prerequisites`, { courseId: result.id })
          }
        }
      } else if (result.id && !prerequisites.enabled) {
        // If prerequisites are disabled, delete all existing prerequisites
        const { error: deleteError } = await dbClient
          .from("course_prerequisites")
          .delete()
          .eq("course_id", result.id)

        if (deleteError) {
          logError("Error deleting prerequisites", deleteError, {
            component: "courses/drafts/route",
            action: "POST",
            courseId: result.id,
          })
        }
      }

      // Save instructors
      if (result.id && instructor.instructorEnabled && Array.isArray(instructor.instructorIds)) {
        // Get existing course instructors
        const { data: existingCourseInstructors } = await dbClient
          .from("course_instructors")
          .select("instructor_id")
          .eq("course_id", result.id)

        const existingInstructorIds = new Set(
          (existingCourseInstructors || []).map((ci: any) => ci.instructor_id)
        )

        const currentInstructorIds = new Set(instructor.instructorIds)

        // Delete removed instructors
        const instructorsToDelete = Array.from(existingInstructorIds).filter(
          (id) => !currentInstructorIds.has(id)
        )
        if (instructorsToDelete.length > 0) {
          const { error: deleteError } = await dbClient
            .from("course_instructors")
            .delete()
            .eq("course_id", result.id)
            .in("instructor_id", instructorsToDelete)

          if (deleteError) {
            logError("Error deleting course instructors", deleteError, {
              component: "courses/drafts/route",
              action: "POST",
              courseId: result.id,
            })
          }
        }

        // Insert new instructors with order_index
        const instructorsToInsert = instructor.instructorIds
          .filter((id) => !existingInstructorIds.has(id))
          .map((instructorId: string, index: number) => {
            // Find the order index in the full list
            const orderIndex = instructor.instructorIds.indexOf(instructorId)
            return {
              course_id: result.id,
              instructor_id: instructorId,
              order_index: orderIndex,
            }
          })

        if (instructorsToInsert.length > 0) {
          const { error: insertError } = await dbClient
            .from("course_instructors")
            .insert(instructorsToInsert)

          if (insertError) {
            logError("Error inserting course instructors", insertError, {
              component: "courses/drafts/route",
              action: "POST",
              courseId: result.id,
            })
          } else {
            logInfo(`Successfully saved ${instructorsToInsert.length} course instructors`, { courseId: result.id })
          }
        }

        // Update order_index for existing instructors
        const instructorsToUpdate = instructor.instructorIds
          .filter((id) => existingInstructorIds.has(id))
          .map((instructorId: string) => {
            const orderIndex = instructor.instructorIds.indexOf(instructorId)
            return {
              instructor_id: instructorId,
              order_index: orderIndex,
            }
          })

        if (instructorsToUpdate.length > 0) {
          for (const update of instructorsToUpdate) {
            const { error: updateError } = await dbClient
              .from("course_instructors")
              .update({ order_index: update.order_index })
              .eq("course_id", result.id)
              .eq("instructor_id", update.instructor_id)

            if (updateError) {
              logError("Error updating course instructor order", updateError, {
                component: "courses/drafts/route",
                action: "POST",
                courseId: result.id,
                instructorId: update.instructor_id,
              })
            }
          }
        }
      } else if (result.id && !instructor.instructorEnabled) {
        // If instructors are disabled, delete all existing course instructors
        const { error: deleteError } = await dbClient
          .from("course_instructors")
          .delete()
          .eq("course_id", result.id)

        if (deleteError) {
          logError("Error deleting course instructors", deleteError, {
            component: "courses/drafts/route",
            action: "POST",
            courseId: result.id,
          })
        }
      }
    }

    return NextResponse.json({ 
      course: result,
      courseId: result.id 
    })
  } catch (error: any) {
    logError("Unexpected error saving draft", error, {
      component: "courses/drafts/route",
      action: "POST",
    })
    return NextResponse.json(
      createErrorResponse(error, 500, { component: "courses/drafts/route", action: "POST" }),
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
      logWarning("Service role key not available, using regular client", {
        component: "courses/drafts/route",
        action: "POST",
        error: serviceError.message,
      })
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
    
    // Fetch course first (without lessons relation to avoid ordering issues)
    const { data, error } = await dbClient
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .eq("created_by", user.id) // Ensure user owns the course
      .single()

    if (error) {
      logError("Error fetching course draft", error, {
        component: "courses/drafts/route",
        action: "GET",
        courseId,
      })
      return NextResponse.json(createErrorResponse(error, 500, { courseId }), { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Fetch lessons separately with proper ordering by order_index
    // Convert courseId to number for the query
    const numericCourseId = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId
    
    logInfo(`Drafts API: Fetching lessons for course ${courseId}`, { numericCourseId })
    
    const { data: lessonsData, error: lessonsError } = await dbClient
      .from("lessons")
      .select("*")
      .eq("course_id", numericCourseId)
      .order("order_index", { ascending: true })
    
    if (lessonsError) {
      logError("Error fetching lessons for course draft", lessonsError, {
        component: "courses/drafts/route",
        action: "GET",
        courseId: courseId,
        numericCourseId: numericCourseId,
        code: lessonsError.code,
        details: lessonsError.details,
      })
      // Don't fail the entire request, but log the error
    }
    
    // Attach lessons to course data (even if empty array)
    const lessons = lessonsData || []
    data.lessons = lessons
    
    logInfo(`Drafts API: Fetched ${lessons.length} lessons for course ${courseId}`, {
      courseId: courseId,
      numericCourseId: numericCourseId,
      lessonIds: lessons.map((l: any) => l.id),
      orderIndices: lessons.map((l: any) => l.order_index),
      lessonTitles: lessons.map((l: any) => l.title),
      hasLessons: lessons.length > 0,
    })

    // Fetch prerequisites
    const { data: prerequisitesData } = await dbClient
      .from("course_prerequisites")
      .select("prerequisite_course_id")
      .eq("course_id", courseId)

    const prerequisiteCourseIds = (prerequisitesData || []).map((p: any) => p.prerequisite_course_id)

    // Transform lessons from database schema to frontend format
    if (data.lessons && Array.isArray(data.lessons) && data.lessons.length > 0) {
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
            // Include type-specific data from question_data
            // This includes: options, correctOption, correctAnswer, correctAnswers, etc.
            ...questionData,
          }
          
          // Ensure required fields exist for each question type
          if (question.type === "multiple-choice" && !question.options) {
            question.options = []
          }
          if (question.type === "multiple-choice" && question.correctOption === undefined) {
            question.correctOption = 0
          }
          if (question.type === "true-false" && question.correctAnswer === undefined) {
            question.correctAnswer = true
          }
          if (question.type === "fill-blank" && !question.correctAnswers) {
            question.correctAnswers = []
          }
          if (question.type === "short-answer" && !question.correctKeywords) {
            question.correctKeywords = []
          }
          
          quizQuestionsByLesson.get(q.lesson_id)!.push(question)
        }
      }

      data.lessons = data.lessons.map((lesson: any) => {
        const settings = {
          isRequired: lesson.is_required !== undefined ? lesson.is_required : true,
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
        
        // Log for debugging - helps verify data is loaded correctly
        logInfo(`Loading lesson ${lesson.id}`, {
          title: lesson.title,
          hasVideoUrl: !!videoUrl,
          hasTextContent: !!textContent,
          resourcesCount: resources.length,
          quizQuestionsCount: quizQuestions.length,
          hasQuizSettings: !!quizSettings,
        })

        // Combine quiz settings and questions into quiz object
        // If there are questions but no settings, create default settings
        // If there are no questions, return null (quiz disabled)
        const quiz = quizQuestions.length > 0 ? {
          enabled: quizSettings?.enabled ?? (quizQuestions.length > 0),
          shuffleQuiz: quizSettings?.shuffleQuiz ?? false,
          maxAttempts: quizSettings?.maxAttempts ?? 3,
          showCorrectAnswers: quizSettings?.showCorrectAnswers ?? true,
          allowMultipleAttempts: quizSettings?.allowMultipleAttempts ?? true,
          timeLimit: quizSettings?.timeLimit ?? null,
          passingScore: quizSettings?.passingScore ?? null,
          questions: quizQuestions,
        } : (quizSettings ? {
          ...quizSettings,
          questions: [],
        } : null)

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
    } else {
      // Ensure lessons array exists even if empty
      data.lessons = []
      logInfo(`Drafts API: No lessons found for course ${courseId}`, { courseId })
    }

    // Add prerequisites to course data
    data.prerequisites = {
      enabled: prerequisiteCourseIds.length > 0,
      courseIds: prerequisiteCourseIds,
    }

    // Fetch course instructors
    const { data: courseInstructorsData } = await dbClient
      .from("course_instructors")
      .select("instructor_id")
      .eq("course_id", courseId)

    const instructorIds = (courseInstructorsData || []).map((ci: any) => ci.instructor_id)
    
    // Transform course settings from database columns to nested structure (for frontend compatibility)
    // Include instructor settings in the transformation
    data.settings = {
      enrollment: {
        enrollmentMode: data.enrollment_mode || "free",
        price: data.price || undefined,
      },
      certificate: {
        certificateEnabled: data.certificate_enabled || false,
        certificateTemplate: data.certificate_template || null,
        certificateTitle: data.certificate_title || null,
        certificateDescription: data.certificate_description || null,
        signatureImage: data.signature_image || null,
        signatureName: data.signature_name || null,
        signatureTitle: data.signature_title || null,
        additionalText: data.additional_text || null,
        certificateType: data.certificate_type || null,
      },
      instructor: {
        instructorEnabled: instructorIds.length > 0,
        instructorIds: instructorIds,
      },
      minimumQuizScore: data.minimum_quiz_score || null,
      requiresSequentialProgress: data.requires_sequential_progress || false,
      currency: data.currency || "USD",
      isPublished: data.is_published || false,
    }
    
    // Ensure lessons array is always present (even if empty)
    if (!data.lessons || !Array.isArray(data.lessons)) {
      data.lessons = []
    }
    
    // Log final response structure for debugging
    logInfo(`Drafts API: Returning course ${courseId} with ${data.lessons.length} lessons`, {
      courseId: courseId,
      lessonsCount: data.lessons.length,
      lessonIds: data.lessons.map((l: any) => l.id),
      lessonTitles: data.lessons.map((l: any) => l.title),
      firstLesson: data.lessons.length > 0 ? {
        id: data.lessons[0].id,
        title: data.lessons[0].title,
        type: data.lessons[0].type,
        hasContent: !!(data.lessons[0].content && Object.keys(data.lessons[0].content).length > 0),
        hasResources: !!(data.lessons[0].resources && data.lessons[0].resources.length > 0),
        hasQuiz: !!data.lessons[0].quiz,
      } : null,
    })

    return NextResponse.json({ course: data })
  } catch (error: any) {
    logError("Unexpected error fetching draft", error, {
      component: "courses/drafts/route",
      action: "GET",
    })
    return NextResponse.json(
      createErrorResponse(error, 500, { component: "courses/drafts/route", action: "GET" }),
      { error: error?.message || "An unexpected error occurred while fetching draft" },
      { status: 500 }
    )
  }
}

