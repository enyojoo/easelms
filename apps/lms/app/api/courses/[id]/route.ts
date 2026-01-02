import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { extractIdFromSlug } from "@/lib/slug"

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
    try {
      supabase = createServiceRoleClient()
    } catch (serviceError: any) {
      console.warn("Service role key not available, using regular client:", serviceError.message)
      supabase = await createClient()
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

    const processedCourse = {
      ...course,
      image: course.image || course.thumbnail || null, // Explicitly ensure image field is included
      creator,
      lessons: lessons.map((lesson: any) => {
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
        // Transform quiz.questions to quiz_questions array while preserving quiz settings
        let quiz_questions = []
        let quizSettings = {}
        
        if (content.quiz) {
          // Preserve quiz settings
          quizSettings = {
            enabled: content.quiz.enabled || false,
            maxAttempts: content.quiz.maxAttempts || 1,
            showCorrectAnswers: content.quiz.showCorrectAnswers || false,
            allowMultipleAttempts: content.quiz.allowMultipleAttempts || false,
          }
          
          // Transform questions array
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
            console.log("Course API: Quiz extracted for lesson", {
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              questionsCount: quiz_questions.length,
              settings: quizSettings,
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
          // Spread content properties (url, vimeoVideoId, html, text, estimatedDuration, etc)
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
        })
        
        return processedLesson
      }),
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
