import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is enrolled in the course
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("status")
    .eq("user_id", user.id)
    .eq("course_id", params.id)
    .single()

  if (!enrollment) {
    return NextResponse.json(
      { error: "You must be enrolled in this course to view quiz results" },
      { status: 403 }
    )
  }

  // Get quiz results for this user and course
  const { data: quizResults, error } = await supabase
    .from("quiz_results")
    .select(`
      *,
      quiz_questions (
        id,
        question,
        type,
        options,
        correct_answer
      )
    `)
    .eq("user_id", user.id)
    .eq("course_id", params.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Format quiz results
  const formattedResults = quizResults?.map((result) => ({
    id: result.id,
    lessonId: result.lesson_id,
    quizQuestionId: result.quiz_question_id,
    question: result.quiz_questions?.question,
    questionType: result.quiz_questions?.type,
    userAnswer: result.user_answer,
    correctAnswer: result.quiz_questions?.correct_answer,
    isCorrect: result.is_correct,
    score: result.score,
    submittedAt: result.created_at,
  })) || []

  // Calculate overall stats
  const totalQuestions = formattedResults.length
  const correctAnswers = formattedResults.filter((r) => r.isCorrect).length
  const overallScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

  return NextResponse.json({
    results: formattedResults,
    stats: {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      overallScore: Math.round(overallScore * 100) / 100,
    },
  })
}

