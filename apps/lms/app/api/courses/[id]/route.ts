import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { extractIdFromSlug } from "@/lib/slug"
import { shuffleQuiz, generateSeed } from "@/lib/quiz/shuffle"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const slugOrId = id
    
    console.log("Course API GET request:", { 
      url: request.url,
      params,
      slugOrId,
      slugOrIdExists: !!slugOrId 
    })
    
    if (!slugOrId) {
      console.error("Course API: No ID provided", { params })
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Extract actual ID from slug (handles both "course-title-123" and "123" formats)
    const idStr = extractIdFromSlug(slugOrId)
    const numericId = parseInt(idStr, 10)

    // Validate that we have a valid numeric ID
    if (isNaN(numericId)) {
      console.error("Course API: Invalid course ID", { slugOrId, idStr, numericId })
      return NextResponse.json({ error: "Invalid course ID format" }, { status: 400 })
    }

    console.log("Course API: Fetching course", { slugOrId, idStr, numericId })

    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    
    let supabase
    let serviceSupabase
    try {
      serviceSupabase = createServiceRoleClient()
      supabase = serviceSupabase
    } catch (serviceError: any) {
      console.warn("Service role key not available, using regular client:", serviceError.message)
      supabase = await createClient()
      serviceSupabase = supabase
    }

      // Fetch single course with creator profile
    let { data: course, error } = await supabase
      .from("courses")
      .select(`
        *,
        profiles!courses_created_by_fkey (
          *
        )
      `)
      .eq("id", numericId)
      .single()
    
    // Fetch lessons separately with proper ordering (always fetch, even if course query succeeded)
    let lessons: any[] = []
    if (course) {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, title, type, video_url, text_content, estimated_duration, is_required, video_progression, order_index")
        .eq("course_id", numericId)
        .order("order_index", { ascending: true })
      
      if (lessonsError) {
        console.error("Error fetching lessons:", lessonsError)
        // Don't fail the entire request if lessons can't be fetched
      } else {
        lessons = lessonsData || []
        console.log(`Course API: Fetched ${lessons.length} lessons for course ${numericId}`)
      }
      
      // Always attach lessons to course object (even if empty array)
      course.lessons = lessons
    }

    // Fetch prerequisites
    const { data: prerequisitesData } = await supabase
      .from("course_prerequisites")
      .select(`
        prerequisite_course_id,
        courses!course_prerequisites_prerequisite_course_id_fkey (
          id,
          title,
          image
        )
      `)
      .eq("course_id", numericId)

    const prerequisites = (prerequisitesData || []).map((p: any) => ({
      id: p.prerequisite_course_id,
      title: p.courses?.title || `Course ${p.prerequisite_course_id}`,
      image: p.courses?.image || null,
    }))

    // If error fetching course, try fallback (shouldn't happen with separate queries, but keep for safety)
    if (error && !course) {
      console.warn("Courses API: Error fetching course, trying fallback:", error.message)
      const { data: basicCourse, error: basicError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", numericId)
        .single()

      if (!basicError && basicCourse) {
        course = basicCourse
        // Fetch lessons separately
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("id, title, type, video_url, text_content, estimated_duration, is_required, video_progression, order_index")
          .eq("course_id", numericId)
          .order("order_index", { ascending: true })
        
        course.lessons = lessonsData || []
        
        // Fetch profile separately
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", course.created_by)
          .single()
        
        if (profileData) {
          course.profiles = profileData
        }
        
        error = null
      } else {
        error = basicError || error
      }
    }

    if (error) {
      console.error("Course API: Database error", {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
      })
      
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Course not found" }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
      }, { status: 500 })
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Process course to ensure proper structure
    // Use lessons already fetched above, or fallback to course.lessons if available
    lessons = Array.isArray(course.lessons) ? course.lessons : (lessons || [])
    
    // Ensure lessons are sorted by order_index (in case they weren't ordered properly)
    lessons = lessons.sort((a: any, b: any) => {
      const orderA = a.order_index ?? a.orderIndex ?? 999
      const orderB = b.order_index ?? b.orderIndex ?? 999
      return orderA - orderB
    })
    
    // Deduplicate lessons by ID (in case Supabase returns duplicates)
    const seenLessonIds = new Set<number>()
    lessons = lessons.filter((lesson: any) => {
      if (!lesson || !lesson.id) {
        console.warn("Course API: Skipping lesson without ID:", lesson)
        return false
      }
      const lessonId = lesson.id
      if (seenLessonIds.has(lessonId)) {
        console.warn("Course API: Skipping duplicate lesson:", lessonId)
        return false
      }
      seenLessonIds.add(lessonId)
      return true
    })
    
    console.log("Course API: Processing lessons", {
      courseId: numericId,
      lessonsCount: lessons.length,
      lessonIds: lessons.map((l: any) => l.id),
      firstLesson: lessons[0] ? { id: lessons[0].id, title: lessons[0].title, order_index: lessons[0].order_index } : null,
    })
    
    // Calculate total duration from lessons (using estimated_duration column)
    const totalDurationMinutes = lessons.reduce((total: number, lesson: any) => {
      const estimatedDuration = lesson.estimated_duration || lesson.content?.estimatedDuration || 0
      return total + estimatedDuration
    }, 0)
    const totalHours = Math.round((totalDurationMinutes / 60) * 10) / 10

    // Transform creator profile data
    const creatorProfile = Array.isArray(course.profiles) ? course.profiles[0] : course.profiles
    const creator = creatorProfile
      ? {
          id: creatorProfile.id,
          name: creatorProfile.name || "Instructor",
          email: creatorProfile.email || "",
          profile_image: creatorProfile.profile_image || "",
          bio: creatorProfile.bio || "",
          user_type: creatorProfile.user_type || "instructor",
        }
      : null

    // Get enrollment count for this course
    const { count: enrollmentCount, error: enrollmentCountError } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", numericId)

    if (enrollmentCountError) {
      console.warn("Course API: Error fetching enrollment count:", enrollmentCountError)
    }

    // Process lessons with async operations (quiz shuffling, etc.)
    // Capture variables in closure to avoid initialization issues
    const courseIdForShuffle = numericId
    const supabaseClientForShuffle = serviceSupabase
    
    const processedLessons = await Promise.all(lessons.map(async (lesson: any) => {
        // Get all data from dedicated columns (NO JSONB content)
        const videoUrl = (lesson.video_url && lesson.video_url.trim() !== '') 
          ? lesson.video_url.trim() 
          : null

        const textContent = (lesson.text_content && lesson.text_content.trim() !== '')
          ? lesson.text_content.trim()
          : null

        const estimatedDuration = lesson.estimated_duration || 0

        // Build content object for frontend compatibility (but data comes from columns)
        const content: any = {}
        if (videoUrl) content.url = videoUrl
        if (textContent) {
          content.html = textContent
          content.text = textContent
        }
        
        // Extract quiz and resources from content JSON (where they're stored)
        // Try to get questions from quiz_questions table first, fallback to JSONB
        let quiz_questions = []
        let quizSettings = {}
        
        // Fetch questions from quiz_questions table
        const { data: dbQuestions } = await supabaseClientForShuffle
          .from("quiz_questions")
          .select("*")
          .eq("lesson_id", lesson.id)
          .order("order_index", { ascending: true })
        
        if (dbQuestions && dbQuestions.length > 0) {
          // Transform database questions to frontend format
          quiz_questions = dbQuestions.map((q: any) => {
            const questionData = q.question_data || {}
            let options: string[] = []
            let correctAnswer: any = 0
            
            if (q.question_type === "multiple-choice") {
              options = questionData.options || []
              correctAnswer = questionData.correctOption ?? 0
            } else if (q.question_type === "true-false") {
              options = ["True", "False"]
              correctAnswer = questionData.correctAnswer === false ? 1 : 0
            } else if (q.question_type === "fill-blank") {
              options = questionData.correctAnswers || []
              correctAnswer = 0
            } else if (q.question_type === "short-answer") {
              options = questionData.correctKeywords || []
              correctAnswer = 0
            } else if (q.question_type === "essay") {
              options = []
              correctAnswer = -1
            } else if (q.question_type === "matching") {
              options = []
              correctAnswer = 0
            }
            
            return {
              id: q.id.toString(),
              question: q.question_text,
              text: q.question_text,
              type: q.question_type,
              options: options,
              correct_answer: correctAnswer,
              correctOption: correctAnswer,
              points: q.points || 1,
              imageUrl: q.image_url,
              explanation: q.explanation,
              difficulty: q.difficulty,
              timeLimit: q.time_limit,
              // Include type-specific data
              ...questionData,
            }
          })
          
          // Get quiz settings from normalized table
          const { data: quizSettingsData, error: settingsError } = await supabaseClientForShuffle
            .from("quiz_settings")
            .select("*")
            .eq("lesson_id", lesson.id)
            .single()

          if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.warn("Error fetching quiz settings:", settingsError)
          }

          if (quizSettingsData) {
            quizSettings = {
              enabled: quizSettingsData.enabled || false,
              maxAttempts: quizSettingsData.max_attempts || 3,
              showCorrectAnswers: quizSettingsData.show_correct_answers !== undefined ? quizSettingsData.show_correct_answers : true,
              allowMultipleAttempts: quizSettingsData.allow_multiple_attempts !== undefined ? quizSettingsData.allow_multiple_attempts : true,
              shuffleQuiz: quizSettingsData.shuffle_quiz || false,
              timeLimit: quizSettingsData.time_limit || null,
              passingScore: quizSettingsData.passing_score || null,
            }
          } else {
            // Default settings if no settings record exists
            quizSettings = {
              enabled: quiz_questions.length > 0,
              maxAttempts: 3,
              showCorrectAnswers: true,
              allowMultipleAttempts: true,
              shuffleQuiz: false,
              timeLimit: null,
              passingScore: null,
            }
          }
          
          // If quiz is disabled, we still need to return questions if user has results
          // This allows showing quiz results even when quiz is disabled
          // The frontend will check quiz.enabled and user results to determine behavior
          // We'll fetch user results here to decide if we should return questions
          let shouldReturnQuestions = quizSettings.enabled
          
          if (!quizSettings.enabled && quiz_questions.length > 0) {
            // Check if current user has quiz results for this lesson
            try {
              const { createClient: createUserClient } = await import("@/lib/supabase/server")
              const userSupabase = await createUserClient()
              const { data: { user } } = await userSupabase.auth.getUser()
              
              if (user) {
                const { data: userResults } = await supabaseClientForShuffle
                  .from("quiz_results")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("lesson_id", lesson.id)
                  .limit(1)
                
                // If user has results, return questions so they can see their results
                if (userResults && userResults.length > 0) {
                  shouldReturnQuestions = true
                  console.log("Course API: Quiz disabled but user has results, returning questions for display", {
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                  })
                } else {
                  // No results, hide quiz completely
                  quiz_questions = []
                  console.log("Course API: Quiz disabled and no user results, hiding quiz", {
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                  })
                }
              } else {
                // No user, hide quiz
                quiz_questions = []
              }
            } catch (error) {
              // If we can't check user results, hide quiz to be safe
              console.warn("Error checking user quiz results:", error)
              quiz_questions = []
            }
          }
          
          // Handle quiz shuffling if enabled
          if (quizSettings.shuffleQuiz && quizSettings.enabled && quiz_questions.length > 0) {
            try {
              // Get current user for shuffle seed
              const { createClient: createUserClient } = await import("@/lib/supabase/server")
              const userSupabase = await createUserClient()
              const { data: { user } } = await userSupabase.auth.getUser()
              
              if (user) {
                try {
                  // Get or create quiz attempt record
                  // On retry, we want to create a new attempt, so check for completed attempts
                  const { data: existingAttempts, error: attemptError } = await supabaseClientForShuffle
                    .from("quiz_attempts")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("lesson_id", lesson.id)
                    .order("attempt_number", { ascending: false })
                    .limit(1)
                  
                  if (attemptError) {
                    console.error("Error fetching quiz attempts:", attemptError)
                    throw attemptError
                  }
                  
                  const existingAttempt = existingAttempts && existingAttempts.length > 0 ? existingAttempts[0] : null
                  
                  let attemptNumber = 1
                  let attemptId: number | null = null
                  
                  if (existingAttempt) {
                    // If there's a completed attempt, increment for retry
                    // If incomplete, reuse it
                    if (existingAttempt.completed_at) {
                      attemptNumber = (existingAttempt.attempt_number || 0) + 1
                    } else {
                      // Reuse incomplete attempt
                      attemptNumber = existingAttempt.attempt_number || 1
                      attemptId = existingAttempt.id
                    }
                  }
                  
                  // Generate seed for shuffling
                  const seed = generateSeed(user.id, lesson.id, attemptNumber)
                  
                  // Shuffle questions and answers
                  const { shuffledQuestions, questionOrder, answerOrders } = shuffleQuiz(quiz_questions, seed)
                  
                  // Create or update quiz attempt record
                  if (existingAttempt && !existingAttempt.completed_at && attemptId) {
                    // Update existing incomplete attempt
                    const { data: updatedAttempt, error: updateError } = await supabaseClientForShuffle
                      .from("quiz_attempts")
                      .update({
                        question_order: questionOrder,
                        answer_orders: answerOrders,
                        completed_at: null, // Reset completion on retry
                      })
                      .eq("id", existingAttempt.id)
                      .select()
                      .single()
                    
                    if (updateError) {
                      console.error("Error updating quiz attempt:", updateError)
                      throw updateError
                    }
                    
                    if (updatedAttempt) {
                      attemptId = updatedAttempt.id
                      attemptNumber = updatedAttempt.attempt_number
                    }
                  } else {
                    // Create new attempt (for retry or first attempt)
                    const { data: newAttempt, error: insertError } = await supabaseClientForShuffle
                      .from("quiz_attempts")
                      .insert({
                        user_id: user.id,
                        lesson_id: lesson.id,
                        course_id: courseIdForShuffle,
                        attempt_number: attemptNumber,
                        question_order: questionOrder,
                        answer_orders: answerOrders,
                      })
                      .select()
                      .single()
                    
                    if (insertError) {
                      console.error("Error creating quiz attempt:", insertError)
                      throw insertError
                    }
                    
                    if (newAttempt) {
                      attemptId = newAttempt.id
                    }
                  }
                
                  // Use shuffled questions
                  quiz_questions = shuffledQuestions
                  
                  console.log("Course API: Quiz shuffled for lesson", {
                    lessonId: lesson.id,
                    attemptId,
                    attemptNumber,
                    questionsCount: quiz_questions.length,
                  })
                } catch (shuffleError: any) {
                  console.error("Error in quiz shuffle process:", {
                    error: shuffleError,
                    message: shuffleError?.message,
                    stack: shuffleError?.stack,
                    lessonId: lesson.id,
                  })
                  // Continue with unshuffled questions if shuffle fails
                }
              }
            } catch (shuffleError: any) {
              console.error("Error shuffling quiz (outer catch):", {
                error: shuffleError,
                message: shuffleError?.message,
                stack: shuffleError?.stack,
                lessonId: lesson.id,
              })
              // Continue with unshuffled questions if shuffle fails
            }
          }
          
          console.log("Course API: Quiz loaded from table for lesson", {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            questionsCount: quiz_questions.length,
            settings: quizSettings,
          })
        } else {
          // No quiz settings found - use defaults
          quizSettings = {
            enabled: quiz_questions.length > 0,
            maxAttempts: 3,
            showCorrectAnswers: true,
            allowMultipleAttempts: true,
            shuffleQuiz: false,
            timeLimit: null,
            passingScore: null,
          }
          
          // Fallback to JSONB for quiz questions only (if no data, this won't execute)
          if (content.quiz && content.quiz.enabled && Array.isArray(content.quiz.questions)) {
            quiz_questions = content.quiz.questions.map((q: any) => ({
              id: q.id,
              question: q.text || q.question,
              text: q.text || q.question,
              type: q.type,
              options: q.options || [],
              correct_answer: q.correctOption,
              correctOption: q.correctOption,
              points: q.points || 0,
              imageUrl: q.imageUrl,
            }))
            
            // Handle quiz shuffling if enabled (JSONB fallback)
            if (quizSettings.shuffleQuiz && quiz_questions.length > 0) {
              try {
                // Get current user for shuffle seed
                const { createClient: createUserClient } = await import("@/lib/supabase/server")
                const userSupabase = await createUserClient()
                const { data: { user } } = await userSupabase.auth.getUser()
                
                if (user) {
                  try {
                    // Get or create quiz attempt record
                    const { data: existingAttempts, error: attemptError } = await supabaseClientForShuffle
                      .from("quiz_attempts")
                      .select("*")
                      .eq("user_id", user.id)
                      .eq("lesson_id", lesson.id)
                      .order("attempt_number", { ascending: false })
                      .limit(1)
                    
                    if (attemptError) {
                      console.error("Error fetching quiz attempts (JSONB):", attemptError)
                      throw attemptError
                    }
                    
                    const existingAttempt = existingAttempts && existingAttempts.length > 0 ? existingAttempts[0] : null
                    
                    let attemptNumber = 1
                    
                    if (existingAttempt) {
                      if (existingAttempt.completed_at) {
                        attemptNumber = (existingAttempt.attempt_number || 0) + 1
                      } else {
                        attemptNumber = existingAttempt.attempt_number || 1
                      }
                    }
                    
                    // Generate seed for shuffling
                    const seed = generateSeed(user.id, lesson.id, attemptNumber)
                    
                    // Shuffle questions and answers
                    const { shuffledQuestions, questionOrder, answerOrders } = shuffleQuiz(quiz_questions, seed)
                    
                    // Create or update quiz attempt record
                    if (existingAttempt && !existingAttempt.completed_at) {
                      // Update existing incomplete attempt
                      const { error: updateError } = await supabaseClientForShuffle
                        .from("quiz_attempts")
                        .update({
                          question_order: questionOrder,
                          answer_orders: answerOrders,
                          completed_at: null,
                        })
                        .eq("id", existingAttempt.id)
                      
                      if (updateError) {
                        console.error("Error updating quiz attempt (JSONB):", updateError)
                        throw updateError
                      }
                    } else {
                      // Create new attempt
                      const { error: insertError } = await supabaseClientForShuffle
                        .from("quiz_attempts")
                        .insert({
                          user_id: user.id,
                          lesson_id: lesson.id,
                          course_id: courseIdForShuffle,
                          attempt_number: attemptNumber,
                          question_order: questionOrder,
                          answer_orders: answerOrders,
                        })
                      
                      if (insertError) {
                        console.error("Error creating quiz attempt (JSONB):", insertError)
                        throw insertError
                      }
                    }
                    
                    // Use shuffled questions
                    quiz_questions = shuffledQuestions
                  } catch (shuffleError: any) {
                    console.error("Error shuffling quiz (JSONB):", {
                      error: shuffleError,
                      message: shuffleError?.message,
                      stack: shuffleError?.stack,
                      lessonId: lesson.id,
                    })
                    // Continue with unshuffled questions if shuffle fails
                  }
                }
              } catch (shuffleError: any) {
                console.error("Error shuffling quiz (JSONB outer catch):", {
                  error: shuffleError,
                  message: shuffleError?.message,
                  stack: shuffleError?.stack,
                  lessonId: lesson.id,
                })
                // Continue with unshuffled questions if shuffle fails
              }
            }
            
            console.log("Course API: Quiz loaded from JSONB (fallback) for lesson", {
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              questionsCount: quiz_questions.length,
            })
          }
        }
        
        // Fetch resources from normalized table
        let resources: any[] = []
        const { data: lessonResources, error: resourcesError } = await supabaseClientForShuffle
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

        if (resourcesError) {
          console.warn("Error fetching resources from table:", resourcesError)
        }

        if (lessonResources && lessonResources.length > 0) {
          resources = lessonResources
            .filter((lr: any) => lr.resources) // Filter out any null resources
            .map((lr: any) => ({
              id: lr.resources.id.toString(),
              title: lr.resources.title,
              description: lr.resources.description,
              type: lr.resources.type,
              url: lr.resources.url,
              fileSize: lr.resources.file_size,
              downloadCount: lr.resources.download_count,
            }))
          console.log("Course API: Resources loaded from table for lesson", {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            resourcesCount: resources.length,
          })
        }
        
        // Create a copy of content without resources (quiz settings moved to normalized table)
        const { resources: contentResources, ...contentRest } = content
        
        const processedLesson = {
        id: lesson.id,
        title: lesson.title,
          type: lesson.type || contentRest.type,
          settings: {
            isRequired: lesson.is_required !== undefined ? lesson.is_required : true,
            videoProgression: lesson.video_progression !== undefined ? lesson.video_progression : false,
          },
          // Spread content properties (url, html, text, estimatedDuration, etc)
          // But NOT quiz and resources (we process those separately)
          ...contentRest,
          resources: resources,
          quiz_questions: quiz_questions,
          quiz: quizSettings, // Include quiz settings for reference
        }
        
        console.log("Course API: Processed lesson", {
          id: processedLesson.id,
          title: processedLesson.title,
          hasResources: resources.length > 0,
          hasQuizQuestions: quiz_questions.length > 0,
          quizSettings: quizSettings,
          url: (processedLesson as any).url,
          urlType: typeof (processedLesson as any).url,
          contentRestKeys: Object.keys(contentRest),
          contentRest: contentRest,
          hasUrl: !!(processedLesson as any).url,
        })
        
        return processedLesson
      }))
    
    const processedCourse = {
      ...course,
      image: course.image || course.thumbnail || null, // Explicitly ensure image field is included
      creator,
      lessons: processedLessons, // Always include lessons (even if empty array)
      totalDurationMinutes,
      totalHours,
      enrolledStudents: enrollmentCount || 0, // Total enrollment count
      prerequisites: prerequisites, // Add prerequisites
      // Transform enrollment and certificate settings from database columns to nested structure
      settings: {
        enrollment: {
          enrollmentMode: course.enrollment_mode || "free",
          price: course.price || undefined,
          recurringPrice: course.recurring_price || undefined,
        },
        certificate: {
          certificateEnabled: course.certificate_enabled || false,
          certificateTemplate: course.certificate_template || null,
          certificateTitle: course.certificate_title || null,
          certificateDescription: course.certificate_description || null,
          signatureImage: course.signature_image || null,
          signatureName: course.signature_name || null,
          signatureTitle: course.signature_title || null,
          additionalText: course.additional_text || null,
          certificateType: course.certificate_type || null,
        },
        minimumQuizScore: course.minimum_quiz_score || null,
        requiresSequentialProgress: course.requires_sequential_progress || false,
        currency: course.currency || "USD",
      },
    }
    
    // Log final course structure for debugging
    console.log("Course API: Returning course", {
      courseId: numericId,
      title: processedCourse.title,
      lessonsCount: processedLessons.length,
      hasCreator: !!creator,
    })

    return NextResponse.json({ course: processedCourse })
  } catch (error: any) {
    console.error("Unexpected error fetching course:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while fetching course" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const slugOrId = id
    
    if (!slugOrId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Extract actual ID from slug
    const idStr = extractIdFromSlug(slugOrId)
    const numericId = parseInt(idStr, 10)

    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid course ID format" }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
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

    // Check if user is admin (use service client to bypass RLS)
    const clientToUse = serviceClient || supabase
    const { data: profile, error: profileError } = await clientToUse
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError)
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    if (profile.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Use service role client for deletion to bypass RLS
    const serviceSupabase = serviceClient || createServiceRoleClient()

    console.log("Deleting course and all related data:", numericId)

    // Cleanup S3 files before deleting database records
    try {
      const { cleanupCourseFiles } = await import("@/lib/aws/s3-cleanup")
      const cleanupResult = await cleanupCourseFiles(numericId)
      console.log(`S3 cleanup: ${cleanupResult.deleted} files deleted, ${cleanupResult.errors} errors`)
    } catch (cleanupError: any) {
      console.error("Error during S3 cleanup (continuing with deletion):", cleanupError)
      // Continue with deletion even if cleanup fails
    }

    // Get all lesson IDs for this course first
    const { data: lessons, error: lessonsError } = await serviceSupabase
      .from("lessons")
      .select("id")
      .eq("course_id", numericId)

    if (lessonsError) {
      console.error("Error fetching lessons:", lessonsError)
      return NextResponse.json({ error: "Failed to fetch course lessons" }, { status: 500 })
    }

    const lessonIds = (lessons || []).map((l: any) => l.id)

    // Delete in order to respect foreign key constraints:
    // 1. Quiz results (references quiz_questions and quiz_attempts)
    if (lessonIds.length > 0) {
      const { error: quizResultsError } = await serviceSupabase
        .from("quiz_results")
        .delete()
        .in("lesson_id", lessonIds)

      if (quizResultsError) {
        console.error("Error deleting quiz results:", quizResultsError)
        // Continue even if this fails - might not exist
      } else {
        console.log(`Deleted quiz results for ${lessonIds.length} lessons`)
      }
    }

    // 2. Quiz attempts (references lessons)
    if (lessonIds.length > 0) {
      const { error: quizAttemptsError } = await serviceSupabase
        .from("quiz_attempts")
        .delete()
        .in("lesson_id", lessonIds)

      if (quizAttemptsError) {
        console.error("Error deleting quiz attempts:", quizAttemptsError)
      } else {
        console.log(`Deleted quiz attempts for ${lessonIds.length} lessons`)
      }
    }

    // 3. Quiz questions (references lessons)
    if (lessonIds.length > 0) {
      const { error: quizQuestionsError } = await serviceSupabase
        .from("quiz_questions")
        .delete()
        .in("lesson_id", lessonIds)

      if (quizQuestionsError) {
        console.error("Error deleting quiz questions:", quizQuestionsError)
      } else {
        console.log(`Deleted quiz questions for ${lessonIds.length} lessons`)
      }
    }

    // 4. Progress (references course and lessons)
    const { error: progressError } = await serviceSupabase
      .from("progress")
      .delete()
      .eq("course_id", numericId)

    if (progressError) {
      console.error("Error deleting progress:", progressError)
    } else {
      console.log("Deleted progress records")
    }

    // 5. Enrollments (references course)
    const { error: enrollmentsError } = await serviceSupabase
      .from("enrollments")
      .delete()
      .eq("course_id", numericId)

    if (enrollmentsError) {
      console.error("Error deleting enrollments:", enrollmentsError)
    } else {
      console.log("Deleted enrollments")
    }

    // 6. Payments and Certificates are kept for historical/audit purposes
    // We preserve these records even after course deletion for financial/legal history
    // If foreign key constraints prevent deletion, we'll handle them gracefully
    try {
      // Try to set course_id to NULL for payments (if constraint allows)
      const { error: paymentsUpdateError } = await serviceSupabase
        .from("payments")
        .update({ course_id: null })
        .eq("course_id", numericId)

      if (paymentsUpdateError) {
        // If update fails (e.g., NOT NULL constraint), records will remain with course_id
        // This is fine - they're preserved for history even if course is deleted
        console.log("Note: Payments records preserved with course_id for historical purposes:", paymentsUpdateError.message)
      } else {
        console.log("Nullified course_id in payments (preserved for history)")
      }
    } catch (e: any) {
      console.log("Payments records will remain with course_id for historical purposes:", e?.message)
    }

    try {
      // Try to set course_id to NULL for certificates (if constraint allows)
      const { error: certificatesUpdateError } = await serviceSupabase
        .from("certificates")
        .update({ course_id: null })
        .eq("course_id", numericId)

      if (certificatesUpdateError) {
        // If update fails (e.g., NOT NULL constraint), records will remain with course_id
        // This is fine - they're preserved for history even if course is deleted
        console.log("Note: Certificate records preserved with course_id for historical purposes:", certificatesUpdateError.message)
      } else {
        console.log("Nullified course_id in certificates (preserved for history)")
      }
    } catch (e: any) {
      console.log("Certificate records will remain with course_id for historical purposes:", e?.message)
    }

    // 7. Lessons (references course) - should cascade to quiz_questions, but we deleted them explicitly above
    const { error: lessonsDeleteError } = await serviceSupabase
      .from("lessons")
      .delete()
      .eq("course_id", numericId)

    if (lessonsDeleteError) {
      console.error("Error deleting lessons:", lessonsDeleteError)
      return NextResponse.json({ error: "Failed to delete lessons" }, { status: 500 })
    } else {
      console.log(`Deleted ${lessonIds.length} lessons`)
    }

    // 8. Finally, delete the course itself
    // Note: Payments and Certificates are preserved for historical/audit purposes
    // If foreign key constraints prevent deletion, we'll provide a helpful error
    const { error: courseDeleteError } = await serviceSupabase
      .from("courses")
      .delete()
      .eq("id", numericId)

    if (courseDeleteError) {
      console.error("Error deleting course:", courseDeleteError)
      
      // Check if error is due to foreign key constraint from payments/certificates
      const errorMessage = courseDeleteError.message || ""
      if (errorMessage.includes("foreign key") && (errorMessage.includes("payments") || errorMessage.includes("certificates"))) {
        // Foreign key constraint is preventing deletion
        // This shouldn't happen if we set course_id to NULL, but if it does,
        // we need to inform the admin that the database schema needs to be updated
        return NextResponse.json({ 
          error: "Cannot delete course: Database constraint prevents deletion. Payments and certificates are preserved for history, but the database schema may need to allow NULL course_id or use ON DELETE SET NULL.",
          details: courseDeleteError.message,
          suggestion: "Update the payments and certificates tables to allow NULL course_id or change foreign key constraint to ON DELETE SET NULL"
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: "Failed to delete course",
        details: courseDeleteError.message 
      }, { status: 500 })
    }

    console.log("Course and all related data deleted successfully:", numericId)

    return NextResponse.json({ message: "Course deleted successfully" })
  } catch (error: any) {
    console.error("Unexpected error deleting course:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while deleting course" },
      { status: 500 }
    )
  }
}
