import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"
import { extractIdFromSlug } from "@/lib/slug"
import { shuffleQuiz, generateSeed } from "@/lib/quiz/shuffle"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const slugOrId = id
    
    logInfo("Course API GET request", { 
      url: request.url,
      params,
      slugOrId,
      slugOrIdExists: !!slugOrId 
    })
    
    if (!slugOrId) {
      logError("Course API: No ID provided", new Error("Course ID is required"), { params })
      return NextResponse.json(createErrorResponse(new Error("Course ID is required"), 400), { status: 400 })
    }

    // Extract actual ID from slug (handles both "course-title-123" and "123" formats)
    const idStr = extractIdFromSlug(slugOrId)
    const numericId = parseInt(idStr, 10)

    // Validate that we have a valid numeric ID
    if (isNaN(numericId)) {
      logError("Course API: Invalid course ID", new Error("Invalid course ID format"), { slugOrId, idStr, numericId })
      return NextResponse.json(createErrorResponse(new Error("Invalid course ID format"), 400), { status: 400 })
    }

    logInfo("Course API: Fetching course", { slugOrId, idStr, numericId })

    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    
    let supabase
    let serviceSupabase
    try {
      serviceSupabase = createServiceRoleClient()
      supabase = serviceSupabase
    } catch (serviceError: any) {
      logWarning("Service role key not available, using regular client", {
        component: "courses/[id]/route",
        action: "GET",
        error: serviceError.message,
      })
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
        .select("id, title, type, video_url, text_content, estimated_duration, is_required, order_index")
        .eq("course_id", numericId)
        .order("order_index", { ascending: true })
      
      if (lessonsError) {
        logError("Error fetching lessons", lessonsError, {
          component: "courses/[id]/route",
          action: "GET",
          courseId: numericId,
        })
        // Don't fail the entire request if lessons can't be fetched
      } else {
        lessons = lessonsData || []
        logInfo(`Course API: Fetched ${lessons.length} lessons for course ${numericId}`, { courseId: numericId })
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

    // Fetch course instructors
    const { data: courseInstructorsData } = await supabase
      .from("course_instructors")
      .select(`
        instructor_id,
        order_index,
        instructors (
          id,
          name,
          image,
          bio
        )
      `)
      .eq("course_id", numericId)
      .order("order_index", { ascending: true })

    const instructors = (courseInstructorsData || [])
      .map((ci: any) => ci.instructors)
      .filter((instructor: any) => instructor !== null)
      .map((instructor: any) => ({
        id: instructor.id,
        name: instructor.name,
        image: instructor.image,
        bio: instructor.bio,
      }))

    // If error fetching course, try fallback (shouldn't happen with separate queries, but keep for safety)
    if (error && !course) {
      logWarning("Courses API: Error fetching course, trying fallback", {
        component: "courses/[id]/route",
        action: "GET",
        error: error.message,
        courseId: numericId,
      })
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
          .select("id, title, type, video_url, text_content, estimated_duration, is_required, order_index")
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
      logError("Course API: Database error", error, {
        component: "courses/[id]/route",
        action: "GET",
        courseId: numericId,
        code: error.code,
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
        logWarning("Course API: Skipping lesson without ID", {
          component: "courses/[id]/route",
          action: "GET",
          lesson: lesson,
        })
        return false
      }
      const lessonId = lesson.id
      if (seenLessonIds.has(lessonId)) {
        logWarning("Course API: Skipping duplicate lesson", {
          component: "courses/[id]/route",
          action: "GET",
          lessonId: lessonId,
        })
        return false
      }
      seenLessonIds.add(lessonId)
      return true
    })
    
    logInfo("Course API: Processing lessons", {
      courseId: numericId,
      lessonsCount: lessons.length,
      lessonIds: lessons.map((l: any) => l.id),
      firstLesson: lessons[0] ? { id: lessons[0].id, title: lessons[0].title, order_index: lessons[0].order_index } : null,
    })
    
    // Calculate total duration from lessons (using estimated_duration column)
    const totalDurationMinutes = lessons.reduce((total: number, lesson: any) => {
      // Use estimated_duration column only (NO JSONB fallback)
      const estimatedDuration = lesson.estimated_duration || 0
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
      logWarning("Course API: Error fetching enrollment count", {
        component: "courses/[id]/route",
        action: "GET",
        error: enrollmentCountError,
        courseId: numericId,
      })
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
        
        // Get quiz questions and settings from normalized tables (NO JSONB fallback)
        let quiz_questions = []
        let quizSettings = {}
        
        // Fetch questions from quiz_questions table (normalized table)
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
            logWarning("Error fetching quiz settings", {
              component: "courses/[id]/route",
              action: "GET",
              error: settingsError,
              lessonId: lesson.id,
            })
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
                  logInfo("Course API: Quiz disabled but user has results, returning questions for display", {
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                  })
                } else {
                  // No results, hide quiz completely
                  quiz_questions = []
                  logInfo("Course API: Quiz disabled and no user results, hiding quiz", {
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
              logWarning("Error checking user quiz results", {
                component: "courses/[id]/route",
                action: "GET",
                error: error,
                lessonId: lesson.id,
              })
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
                    logError("Error fetching quiz attempts", attemptError, {
                      component: "courses/[id]/route",
                      action: "GET",
                      lessonId: lesson.id,
                      userId: user.id,
                    })
                    throw attemptError
                  }
                  
                  const existingAttempt = existingAttempts && existingAttempts.length > 0 ? existingAttempts[0] : null
                  
                  // DO NOT create or update attempts on page load
                  // Only use existing attempt's shuffle order if available
                  let shuffledQuestions = quiz_questions
                  let questionOrder: number[] = quiz_questions.map((q: any) => parseInt(String(q.id)) || 0)
                  let answerOrders: { [key: string]: number[] } = {}
                  
                  if (existingAttempt && existingAttempt.question_order && Array.isArray(existingAttempt.question_order)) {
                    // Use existing attempt's shuffle order
                    questionOrder = existingAttempt.question_order
                    
                    // Reconstruct shuffled questions using existing order
                    const questionMap = new Map(quiz_questions.map((q: any) => [parseInt(String(q.id)) || 0, q]))
                    shuffledQuestions = questionOrder
                      .map((qId: number) => questionMap.get(qId))
                      .filter(Boolean)
                    
                    // Use existing answer orders if available
                    if (existingAttempt.answer_orders && typeof existingAttempt.answer_orders === 'object') {
                      answerOrders = existingAttempt.answer_orders
                    }
                    
                    logInfo("Using existing quiz attempt shuffle order", {
                        lessonId: lesson.id,
                        attemptId: existingAttempt.id,
                      attemptNumber: existingAttempt.attempt_number,
                      isCompleted: !!existingAttempt.completed_at,
                      note: "Attempt not created/updated on page load",
                    })
                  } else {
                    // No existing attempt - generate shuffle for display but DON'T create attempt
                    // Attempt will be created when user submits quiz in quiz-results POST route
                    const attemptNumber = existingAttempt?.attempt_number || 1
                    const seed = generateSeed(user.id, lesson.id, attemptNumber)
                    const shuffleResult = shuffleQuiz(quiz_questions, seed)
                    shuffledQuestions = shuffleResult.shuffledQuestions
                    questionOrder = shuffleResult.questionOrder
                    answerOrders = shuffleResult.answerOrders
                    
                    logInfo("No existing quiz attempt - shuffle generated but attempt not created", {
                        lessonId: lesson.id,
                        attemptNumber,
                      note: "Attempt will be created when quiz is submitted",
                      })
                  }
                
                  // Use shuffled questions for display
                  quiz_questions = shuffledQuestions
                  
                  logInfo("Course API: Quiz shuffled for lesson", {
                    lessonId: lesson.id,
                    hasExistingAttempt: !!existingAttempt,
                    attemptId: existingAttempt?.id || null,
                    attemptNumber: existingAttempt?.attempt_number || null,
                    questionsCount: quiz_questions.length,
                    note: "No attempt created/updated on page load",
                  })
                } catch (shuffleError: any) {
                  logError("Error in quiz shuffle process", shuffleError, {
                    component: "courses/[id]/route",
                    action: "GET",
                    lessonId: lesson.id,
                  })
                  // Continue with unshuffled questions if shuffle fails
                }
              }
            } catch (shuffleError: any) {
              logError("Error shuffling quiz (outer catch)", shuffleError, {
                component: "courses/[id]/route",
                action: "GET",
                lessonId: lesson.id,
              })
              // Continue with unshuffled questions if shuffle fails
            }
          }
          
          logInfo("Course API: Quiz loaded from table for lesson", {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            questionsCount: quiz_questions.length,
            settings: quizSettings,
          })
        } else {
          // No quiz settings found - use defaults (only if we have questions)
          // If no questions in normalized table, quiz is empty (no JSONB fallback)
          quizSettings = {
            enabled: quiz_questions.length > 0,
            maxAttempts: 3,
            showCorrectAnswers: true,
            allowMultipleAttempts: true,
            shuffleQuiz: false,
            timeLimit: null,
            passingScore: null,
          }
          
          logInfo("Course API: No quiz settings found for lesson, using defaults", {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            questionsCount: quiz_questions.length,
          })
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
          logWarning("Error fetching resources from table", {
            component: "courses/[id]/route",
            action: "GET",
            error: resourcesError,
            lessonId: lesson.id,
          })
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
          logInfo("Course API: Resources loaded from table for lesson", {
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
          },
          // Spread content properties (url, html, text, estimatedDuration, etc)
          // But NOT quiz and resources (we process those separately)
          ...contentRest,
          resources: resources,
          quiz_questions: quiz_questions,
          quiz: quizSettings, // Include quiz settings for reference
        }
        
        logInfo("Course API: Processed lesson", {
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
      instructors: instructors, // Add instructors
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
        instructor: {
          instructorEnabled: instructors.length > 0, // Enabled if there are instructors
          instructorIds: instructors.map((i: any) => i.id),
        },
        minimumQuizScore: course.minimum_quiz_score || null,
        requiresSequentialProgress: course.requires_sequential_progress || false,
        currency: course.currency || "USD",
      },
    }
    
    // Log final course structure for debugging
    logInfo("Course API: Returning course", {
      courseId: numericId,
      title: processedCourse.title,
      lessonsCount: processedLessons.length,
      hasCreator: !!creator,
    })

    return NextResponse.json({ course: processedCourse })
  } catch (error: any) {
    logError("Unexpected error fetching course", error, {
      component: "courses/[id]/route",
      action: "GET",
    })
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
      logWarning("Service role key not available, using regular client", {
        component: "courses/[id]/route",
        action: "GET",
        error: serviceError.message,
      })
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
      logError("Error fetching user profile", profileError, {
        component: "courses/[id]/route",
        action: "DELETE",
        userId: user.id,
      })
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    if (profile.user_type !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Use service role client for deletion to bypass RLS
    const serviceSupabase = serviceClient || createServiceRoleClient()

    logInfo("Deleting course and all related data", { courseId: numericId })

    // Cleanup S3 files before deleting database records
    try {
      const { cleanupCourseFiles } = await import("@/lib/aws/s3-cleanup")
      const cleanupResult = await cleanupCourseFiles(numericId)
      logInfo(`S3 cleanup: ${cleanupResult.deleted} files deleted, ${cleanupResult.errors} errors`, { courseId: numericId })
    } catch (cleanupError: any) {
      logError("Error during S3 cleanup (continuing with deletion)", cleanupError, {
        component: "courses/[id]/route",
        action: "DELETE",
        courseId: numericId,
      })
      // Continue with deletion even if cleanup fails
    }

    // Get all lesson IDs for this course first
    const { data: lessons, error: lessonsError } = await serviceSupabase
      .from("lessons")
      .select("id")
      .eq("course_id", numericId)

    if (lessonsError) {
      logError("Error fetching lessons", lessonsError, {
        component: "courses/[id]/route",
        action: "DELETE",
        courseId: numericId,
      })
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
        logError("Error deleting quiz results", quizResultsError, {
          component: "courses/[id]/route",
          action: "DELETE",
          courseId: numericId,
          lessonIds,
        })
        // Continue even if this fails - might not exist
      } else {
        logInfo(`Deleted quiz results for ${lessonIds.length} lessons`, { courseId: numericId })
      }
    }

    // 2. Quiz attempts (references lessons)
    if (lessonIds.length > 0) {
      const { error: quizAttemptsError } = await serviceSupabase
        .from("quiz_attempts")
        .delete()
        .in("lesson_id", lessonIds)

      if (quizAttemptsError) {
        logError("Error deleting quiz attempts", quizAttemptsError, {
          component: "courses/[id]/route",
          action: "DELETE",
          courseId: numericId,
          lessonIds,
        })
      } else {
        logInfo(`Deleted quiz attempts for ${lessonIds.length} lessons`, { courseId: numericId })
      }
    }

    // 3. Quiz questions (references lessons)
    if (lessonIds.length > 0) {
      const { error: quizQuestionsError } = await serviceSupabase
        .from("quiz_questions")
        .delete()
        .in("lesson_id", lessonIds)

      if (quizQuestionsError) {
        logError("Error deleting quiz questions", quizQuestionsError, {
          component: "courses/[id]/route",
          action: "DELETE",
          courseId: numericId,
          lessonIds,
        })
      } else {
        logInfo(`Deleted quiz questions for ${lessonIds.length} lessons`, { courseId: numericId })
      }
    }

    // 4. Progress (references course and lessons)
    const { error: progressError } = await serviceSupabase
      .from("progress")
      .delete()
      .eq("course_id", numericId)

    if (progressError) {
      logError("Error deleting progress", progressError, {
        component: "courses/[id]/route",
        action: "DELETE",
        courseId: numericId,
      })
    } else {
      logInfo("Deleted progress records", { courseId: numericId })
    }

    // 5. Enrollments (references course)
    const { error: enrollmentsError } = await serviceSupabase
      .from("enrollments")
      .delete()
      .eq("course_id", numericId)

    if (enrollmentsError) {
      logError("Error deleting enrollments", enrollmentsError, {
        component: "courses/[id]/route",
        action: "DELETE",
        courseId: numericId,
      })
    } else {
      logInfo("Deleted enrollments", { courseId: numericId })
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
        logInfo("Note: Payments records preserved with course_id for historical purposes", { message: paymentsUpdateError.message, courseId: numericId })
      } else {
        logInfo("Nullified course_id in payments (preserved for history)", { courseId: numericId })
      }
    } catch (e: any) {
      logInfo("Payments records will remain with course_id for historical purposes", { message: e?.message, courseId: numericId })
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
        logInfo("Note: Certificate records preserved with course_id for historical purposes", { message: certificatesUpdateError.message, courseId: numericId })
      } else {
        logInfo("Nullified course_id in certificates (preserved for history)", { courseId: numericId })
      }
    } catch (e: any) {
      logInfo("Certificate records will remain with course_id for historical purposes", { message: e?.message, courseId: numericId })
    }

    // 7. Lessons (references course) - should cascade to quiz_questions, but we deleted them explicitly above
    const { error: lessonsDeleteError } = await serviceSupabase
      .from("lessons")
      .delete()
      .eq("course_id", numericId)

    if (lessonsDeleteError) {
      logError("Error deleting lessons", lessonsDeleteError, {
        component: "courses/[id]/route",
        action: "DELETE",
        courseId: numericId,
        lessonIds,
      })
      return NextResponse.json(createErrorResponse(lessonsDeleteError, 500, { courseId: numericId }), { status: 500 })
    } else {
      logInfo(`Deleted ${lessonIds.length} lessons`, { courseId: numericId })
    }

    // 8. Finally, delete the course itself
    // Note: Payments and Certificates are preserved for historical/audit purposes
    // If foreign key constraints prevent deletion, we'll provide a helpful error
    const { error: courseDeleteError } = await serviceSupabase
      .from("courses")
      .delete()
      .eq("id", numericId)

    if (courseDeleteError) {
      logError("Error deleting course", courseDeleteError, {
        component: "courses/[id]/route",
        action: "DELETE",
        courseId: numericId,
      })
      
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

    logInfo("Course and all related data deleted successfully", { courseId: numericId })

    return NextResponse.json({ message: "Course deleted successfully" })
  } catch (error: any) {
    logError("Unexpected error deleting course", error, {
      component: "courses/[id]/route",
      action: "DELETE",
    })
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while deleting course" },
      { status: 500 }
    )
  }
}
