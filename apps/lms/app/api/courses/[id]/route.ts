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

      // Fetch single course with lessons and creator profile
    let { data: course, error } = await supabase
      .from("courses")
      .select(`
        *,
        lessons (id, title, type, content, is_required, video_progression),
        profiles!courses_created_by_fkey (
          *
        )
      `)
      .eq("id", numericId)
      .single()

    // If error with lessons relation, try with simpler select
    if (error) {
      console.warn("Courses API: Error with lessons relation, trying with simpler select:", error.message)
      const { data: basicCourse, error: basicError } = await supabase
        .from("courses")
        .select(`
          *,
          lessons (id, title, type, content, is_required, video_progression),
          profiles!courses_created_by_fkey (
            *
          )
        `)
        .eq("id", numericId)
        .single()

      if (!basicError) {
        course = basicCourse
        error = null
      } else {
        error = basicError
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
    let lessons = Array.isArray(course.lessons) ? course.lessons : []
    
    // Deduplicate lessons by ID (in case Supabase returns duplicates)
    const seenLessonIds = new Set<number>()
    lessons = lessons.filter((lesson: any) => {
      const lessonId = lesson.id
      if (seenLessonIds.has(lessonId)) {
        return false
      }
      seenLessonIds.add(lessonId)
      return true
    })
    
    console.log("Course API: Processing lessons", {
      courseId: numericId,
      lessonsCount: lessons.length,
      firstLesson: lessons[0],
    })
    
    // Calculate total duration from lessons
    const totalDurationMinutes = lessons.reduce((total: number, lesson: any) => {
      const estimatedDuration = lesson.content?.estimatedDuration || 0
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
        // Parse lesson content if it's a JSON string
        let content = lesson.content
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content)
          } catch (e) {
            console.warn("Failed to parse lesson content:", e)
            content = {}
          }
        }
        
        // Ensure content is an object
        if (!content || typeof content !== 'object') {
          content = {}
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
          
          // Get quiz settings from content (still stored there)
          if (content.quiz) {
            quizSettings = {
              enabled: content.quiz.enabled || false,
              maxAttempts: content.quiz.maxAttempts || 1,
              showCorrectAnswers: content.quiz.showCorrectAnswers || false,
              allowMultipleAttempts: content.quiz.allowMultipleAttempts || false,
              shuffleQuiz: content.quiz.shuffleQuiz || false,
            }
          } else {
            // Default settings if quiz is enabled
            quizSettings = {
              enabled: quiz_questions.length > 0,
              maxAttempts: 3,
              showCorrectAnswers: true,
              allowMultipleAttempts: true,
              shuffleQuiz: false,
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
        } else if (content.quiz) {
          // Fallback to JSONB storage (backward compatibility)
          quizSettings = {
            enabled: content.quiz.enabled || false,
            maxAttempts: content.quiz.maxAttempts || 1,
            showCorrectAnswers: content.quiz.showCorrectAnswers || false,
            allowMultipleAttempts: content.quiz.allowMultipleAttempts || false,
            shuffleQuiz: content.quiz.shuffleQuiz || false,
          }
          
          if (content.quiz.enabled && Array.isArray(content.quiz.questions)) {
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
        
        let resources = []
        if (Array.isArray(content.resources)) {
          resources = content.resources.map((r: any) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            url: r.url,
            description: r.description,
            fileSize: r.fileSize,
          }))
          console.log("Course API: Resources extracted for lesson", {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            resourcesCount: resources.length,
          })
        }
        
        // Create a copy of content without quiz and resources (we'll add processed versions)
        const { quiz, resources: contentResources, ...contentRest } = content
        
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
      lessons: processedLessons,
      totalDurationMinutes,
      totalHours,
      enrolledStudents: enrollmentCount || 0, // Total enrollment count
      // Transform enrollment settings from database columns to nested structure
      settings: {
        enrollment: {
          enrollmentMode: course.enrollment_mode || "free",
          price: course.price || undefined,
          recurringPrice: course.recurring_price || undefined,
        },
      },
    }

    return NextResponse.json({ course: processedCourse })
  } catch (error: any) {
    console.error("Unexpected error fetching course:", error)
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while fetching course" },
      { status: 500 }
    )
  }
}
