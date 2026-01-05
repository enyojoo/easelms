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
      image: courseData.basicInfo?.thumbnail || null, // Schema uses 'image', not 'thumbnail'
      preview_video: courseData.basicInfo?.previewVideo || null,
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
      signature_image: certificate.signatureImage || null,
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
        // Store resources, quiz, and estimatedDuration in content JSONB
        const lessonContent = {
          ...(lesson.content || {}),
          resources: lesson.resources || [],
          quiz: lesson.quiz || null,
          estimatedDuration: lesson.estimatedDuration || 0,
        }

        // Extract settings fields to match schema
        const settings = lesson.settings || {}
        
        const lessonData = {
          course_id: result.id,
          title: lesson.title || "",
          type: lesson.type || "text",
          content: lessonContent,
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

        // Extract quiz questions from lesson data
        const quiz = lesson.quiz
        if (!quiz || !quiz.enabled || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
          // If no quiz or no questions, delete existing questions
          if (existingQuestionIds.size > 0) {
            await dbClient
              .from("quiz_questions")
              .delete()
              .eq("lesson_id", actualLessonId)
          }
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
            image_url: question.imageUrl || null,
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
      data.lessons = data.lessons.map((lesson: any) => {
        const content = lesson.content || {}
        const settings = {
          isRequired: lesson.is_required !== undefined ? lesson.is_required : true,
          videoProgression: lesson.video_progression !== undefined ? lesson.video_progression : false,
        }

        return {
          id: lesson.id?.toString() || `lesson-${Date.now()}`,
          title: lesson.title || "",
          type: lesson.type || "text",
          content: {
            ...content,
            // Remove resources, quiz, estimatedDuration from content as they're separate
          },
          resources: content.resources || [],
          settings: settings,
          quiz: content.quiz || null,
          estimatedDuration: content.estimatedDuration || 0,
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

