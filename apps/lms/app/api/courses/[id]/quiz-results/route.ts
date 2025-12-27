import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Await params since it's a Promise in Next.js 16
  const { id } = await params
  const courseId = parseInt(id)

  console.log("Quiz results GET - User:", user.id, "CourseId:", courseId)

  // Use service role to bypass RLS and get quiz results
  const serviceSupabase = createServiceRoleClient()
  
  // Get quiz results for this user and course
  const { data: quizResults, error } = await serviceSupabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching quiz results:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return results grouped by lesson
  const resultsByLesson: { [lessonId: number]: any[] } = {}
  if (quizResults) {
    quizResults.forEach((result: any) => {
      if (!resultsByLesson[result.lesson_id]) {
        resultsByLesson[result.lesson_id] = []
      }
      resultsByLesson[result.lesson_id].push(result)
    })
  }

  return NextResponse.json({
    results: quizResults || [],
    resultsByLesson: resultsByLesson,
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Await params since it's a Promise in Next.js 16
  const { id } = await params
  const courseId = parseInt(id)

  console.log("Quiz results POST - User:", user.id, "CourseId:", courseId, "ParamsId:", id)

  // Check if user is enrolled in the course
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("status")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single()

  console.log("Enrollment check - Enrollment:", enrollment, "Error:", enrollmentError)

  if (!enrollment) {
    return NextResponse.json(
      { error: "You must be enrolled in this course to submit quiz results" },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { lessonId, answers } = body // answers is array of { questionId, userAnswer }

  if (!lessonId || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json(
      { error: "Invalid request: lessonId and answers array are required" },
      { status: 400 }
    )
  }

  try {
    // Use service role client to bypass RLS policies for fetching lesson
    const serviceSupabase = createServiceRoleClient()
    
    // Fetch lesson content to get quiz questions
    const { data: lesson, error: lessonError } = await serviceSupabase
      .from("lessons")
      .select("content")
      .eq("id", lessonId)
      .single()

    console.log("Fetching lesson - LessonId:", lessonId, "LessonError:", lessonError)

    if (lessonError || !lesson) {
      console.error("Lesson fetch error:", lessonError)
      return NextResponse.json(
        { error: "Failed to fetch lesson" },
        { status: 500 }
      )
    }

    // Parse content if it's a JSON string
    let content = lesson.content
    if (typeof content === "string") {
      try {
        content = JSON.parse(content)
      } catch (e) {
        console.error("Failed to parse lesson content:", e)
        content = {}
      }
    }

    // Extract quiz questions from content
    const quizQuestions = content?.quiz?.questions || []
    console.log("Extracted quiz questions - Count:", quizQuestions.length)

    // Process and save each answer
    const resultsToInsert = []
    let correctCount = 0

    for (const answer of answers) {
      const question = quizQuestions.find((q: any) => q.id === answer.questionId)
      if (!question) {
        console.log("Question not found for id:", answer.questionId)
        continue
      }

      // Determine if answer is correct based on question type
      let isCorrect = false
      const qType = question.type || "multiple-choice"
      
      if (qType === "multiple-choice") {
        // For multiple choice, compare with correctOption index
        isCorrect = question.correctOption === answer.userAnswer
      } else if (qType === "true-false") {
        isCorrect = question.correctOption === answer.userAnswer
      } else if (qType === "fill-blank") {
        const correctAnswers = Array.isArray(question.correctAnswers)
          ? question.correctAnswers
          : [question.correctAnswers]
        isCorrect = correctAnswers.some(
          (ca: any) => ca.toString().toLowerCase() === answer.userAnswer?.toString().toLowerCase()
        )
      } else if (qType === "short-answer") {
        // For short answer, check if user answer contains keywords
        const correctKeywords = Array.isArray(question.correctKeywords)
          ? question.correctKeywords
          : [question.correctKeywords]
        const userAnswerLower = answer.userAnswer?.toString().toLowerCase() || ""
        isCorrect = correctKeywords.some((keyword: any) =>
          userAnswerLower.includes(keyword.toString().toLowerCase())
        )
      } else {
        // For essay and other types, default to false or handle differently
        isCorrect = false
      }

      if (isCorrect) correctCount++

      resultsToInsert.push({
        user_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        quiz_question_id: question.id || answer.questionId,
        user_answer: answer.userAnswer,
        is_correct: isCorrect,
        score: isCorrect ? 1 : 0,
      })
    }

    // Delete existing quiz results for this user+lesson to avoid duplicates on retake
    const { error: deleteError } = await serviceSupabase
      .from("quiz_results")
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)

    if (deleteError) {
      console.warn("Warning: Could not delete old quiz results:", deleteError)
    } else {
      console.log("Deleted previous quiz results for this lesson")
    }

    // Insert all quiz results using service role to bypass RLS
    const { data: insertedResults, error: insertError } = await serviceSupabase
      .from("quiz_results")
      .insert(resultsToInsert)
      .select()

    if (insertError) {
      console.error("Error inserting quiz results:", insertError)
      // Don't fail if insertion fails - still return the score
      console.warn("Quiz results not saved to database, but score calculated")
    } else {
      console.log("Quiz results saved successfully:", insertedResults?.length, "records")
    }

    // Calculate overall score
    const totalQuestions = answers.length
    const overallScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

    return NextResponse.json({
      message: "Quiz completed successfully",
      results: insertedResults || [],
      stats: {
        totalQuestions,
        correctAnswers: correctCount,
        incorrectAnswers: totalQuestions - correctCount,
        overallScore: Math.round(overallScore * 100) / 100,
      },
    })
  } catch (error: any) {
    console.error("Error processing quiz results:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save quiz results" },
      { status: 500 }
    )
  }
}

