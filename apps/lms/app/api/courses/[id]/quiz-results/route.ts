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

export async function POST(
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
    // Fetch quiz questions to validate answers
    const { data: questions, error: questionsError } = await supabase
      .from("quiz_questions")
      .select("id, correct_answer, type, options")
      .eq("lesson_id", lessonId)

    if (questionsError) {
      return NextResponse.json(
        { error: "Failed to fetch quiz questions" },
        { status: 500 }
      )
    }

    // Process and save each answer
    const resultsToInsert = []
    let correctCount = 0

    for (const answer of answers) {
      const question = questions?.find((q) => q.id === answer.questionId)
      if (!question) continue

      // Determine if answer is correct based on question type
      let isCorrect = false
      if (question.type === "multiple_choice") {
        isCorrect = question.correct_answer === answer.userAnswer
      } else if (question.type === "true_false") {
        isCorrect = question.correct_answer === answer.userAnswer
      } else if (question.type === "fill_blank" || question.type === "fill-blank") {
        const correctAnswers = Array.isArray(question.correct_answer)
          ? question.correct_answer
          : [question.correct_answer]
        isCorrect = correctAnswers.some(
          (ca) => ca.toString().toLowerCase() === answer.userAnswer?.toString().toLowerCase()
        )
      } else if (question.type === "short_answer" || question.type === "short-answer") {
        // For short answer, check if user answer contains keywords
        const correctKeywords = Array.isArray(question.correct_answer)
          ? question.correct_answer
          : [question.correct_answer]
        const userAnswerLower = answer.userAnswer?.toString().toLowerCase() || ""
        isCorrect = correctKeywords.some((keyword) =>
          userAnswerLower.includes(keyword.toString().toLowerCase())
        )
      } else {
        // For essay and other types, default to false or handle differently
        isCorrect = false
      }

      if (isCorrect) correctCount++

      resultsToInsert.push({
        user_id: user.id,
        course_id: parseInt(params.id),
        lesson_id: lessonId,
        quiz_question_id: answer.questionId,
        user_answer: answer.userAnswer,
        is_correct: isCorrect,
        score: isCorrect ? 1 : 0,
      })
    }

    // Insert all quiz results
    const { data: insertedResults, error: insertError } = await supabase
      .from("quiz_results")
      .insert(resultsToInsert)
      .select()

    if (insertError) {
      console.error("Error inserting quiz results:", insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    // Calculate overall score
    const totalQuestions = answers.length
    const overallScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

    return NextResponse.json({
      message: "Quiz results saved successfully",
      results: insertedResults,
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

