import { NextResponse } from "next/server"
import { extractIdFromSlug } from "@/lib/slug"
import { logError, logWarning, logInfo, createErrorResponse } from "@/lib/utils/errorHandler"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { createClient, createServiceRoleClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Await params since it's a Promise in Next.js 16
  const { id } = await params
  // Extract actual ID from slug (handles both "course-title-123" and "123" formats)
  const idStr = extractIdFromSlug(id)
  const courseId = parseInt(idStr, 10)
  
  if (isNaN(courseId)) {
    return NextResponse.json({ error: "Invalid course ID format" }, { status: 400 })
  }

  logInfo("Quiz results GET", { userId: user.id, courseId })

  // Use service role to bypass RLS and get quiz results
  const serviceSupabase = createServiceRoleClient()

  // Get quiz results for this user and course
  // Include shuffle data (denormalized) for instant display
  const { data: quizResults, error } = await serviceSupabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })

  if (error) {
    logError("Error fetching quiz results", error, {
      component: "courses/[id]/quiz-results/route",
      action: "GET",
      userId: user.id,
      courseId,
    })
    return NextResponse.json(createErrorResponse(error, 500, { userId: user.id, courseId }), { status: 500 })
  }

  // Return results grouped by lesson with shuffle data included
  const resultsByLesson: { [lessonId: number]: any[] } = {}
  if (quizResults) {
    quizResults.forEach((result: any) => {
      if (!resultsByLesson[result.lesson_id]) {
        resultsByLesson[result.lesson_id] = []
      }
      // Include shuffle data in each result for instant display
      resultsByLesson[result.lesson_id].push({
        ...result,
        shuffled_question_order: result.shuffled_question_order || null,
        shuffled_answer_orders: result.shuffled_answer_orders || null,
        attempt_id: result.attempt_id || null,
      })
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
  const { createClient, createServiceRoleClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Await params since it's a Promise in Next.js 16
  const { id } = await params
  // Extract actual ID from slug (handles both "course-title-123" and "123" formats)
  const idStr = extractIdFromSlug(id)
  const courseId = parseInt(idStr, 10)
  
  if (isNaN(courseId)) {
    return NextResponse.json({ error: "Invalid course ID format" }, { status: 400 })
  }

  logInfo("Quiz results POST", { userId: user.id, courseId, paramsId: id })

  // Check if user is enrolled in the course
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("status")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .single()

  logInfo("Enrollment check", { enrollment: !!enrollment, error: enrollmentError?.message })

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
    
    // Fetch quiz questions from quiz_questions table (preferred)
    const { data: dbQuestions, error: questionsError } = await serviceSupabase
      .from("quiz_questions")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: true })

    let quizQuestions: any[] = []

    if (dbQuestions && dbQuestions.length > 0) {
      // Transform database questions to match frontend format
      quizQuestions = dbQuestions.map((q: any) => {
        const questionData = q.question_data || {}
        let options: string[] = []
        let correctOption: any = 0
        
        if (q.question_type === "multiple-choice") {
          options = questionData.options || []
          correctOption = questionData.correctOption ?? 0
        } else if (q.question_type === "true-false") {
          options = ["True", "False"]
          correctOption = questionData.correctAnswer === false ? 1 : 0
        } else if (q.question_type === "fill-blank") {
          options = questionData.correctAnswers || []
          correctOption = 0
        } else if (q.question_type === "short-answer") {
          options = questionData.correctKeywords || []
          correctOption = 0
        } else if (q.question_type === "essay") {
          options = []
          correctOption = -1
        } else if (q.question_type === "matching") {
          options = []
          correctOption = 0
        }
        
        return {
          id: q.id.toString(), // Use database ID as string for matching
          dbId: q.id, // Keep integer ID for foreign key
          type: q.question_type,
          text: q.question_text,
          options: options,
          correctOption: correctOption,
          correct_answer: correctOption,
          points: q.points || 1,
          imageUrl: q.image_url,
          explanation: q.explanation,
          difficulty: q.difficulty,
          timeLimit: q.time_limit,
          // Include type-specific data
          ...questionData,
        }
      })
      
      logInfo("Fetched quiz questions from table", { count: quizQuestions.length, lessonId })
    } else {
      // NO JSONB fallback - only use normalized quiz_questions table
      // If no questions found in table, quiz is empty
      quizQuestions = []
      logInfo("No quiz questions found in normalized table for lesson", { lessonId })
    }
    
    logInfo("Received answers", { answersCount: answers.length, lessonId })
    logInfo("Question IDs in quiz", { questionIds: quizQuestions.map((q: any) => ({ id: q.id, dbId: q.dbId, type: typeof q.id })) })

    // Fetch quiz attempt to get shuffle mapping
    // Use .maybeSingle() instead of .single() to handle case where no attempt exists yet
    const { data: quizAttempt, error: attemptFetchError } = await serviceSupabase
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (attemptFetchError && attemptFetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected if no attempt exists)
      logWarning("Error fetching quiz attempt", {
        component: "courses/[id]/quiz-results/route",
        action: "POST",
        error: attemptFetchError,
        lessonId,
      })
    }

    const hasShuffle = quizAttempt && quizAttempt.question_order && Array.isArray(quizAttempt.question_order) && quizAttempt.question_order.length > 0
    const questionOrder = hasShuffle ? quizAttempt.question_order : null
    // Note: answerOrders is no longer used - answers are NOT shuffled, only questions are
    let attemptId = quizAttempt?.id || null
    let attemptNumber = quizAttempt?.attempt_number || 1
    
    // If attempt exists but is not completed, mark it as completed now
    // This is when the attempt counts toward max attempts - when "Finish Quiz" is clicked
    // Also increment the attempt_number at this point
    if (quizAttempt && !quizAttempt.completed_at) {
      // Get the highest completed attempt number to calculate the next one
      const { data: completedAttempts, error: completedAttemptsError } = await serviceSupabase
        .from("quiz_attempts")
        .select("attempt_number")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .not("completed_at", "is", null)
        .order("attempt_number", { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (completedAttemptsError && completedAttemptsError.code !== 'PGRST116') {
        logWarning("Error fetching completed attempts for attempt number calculation", {
          component: "courses/[id]/quiz-results/route",
          action: "POST",
          error: completedAttemptsError,
          lessonId,
        })
      }
      
      // Calculate the attempt number - use the highest completed attempt + 1
      // This ensures attempts only count when "Finish Quiz" is clicked
      // The incomplete attempt might have the same attempt_number as the last completed attempt
      // (from when it was created on retry), so we always calculate based on completed attempts
      const highestCompletedAttemptNumber = completedAttempts?.attempt_number || 0
      const finalAttemptNumber = highestCompletedAttemptNumber + 1
      
      const { data: updatedAttempt, error: updateAttemptError } = await serviceSupabase
        .from("quiz_attempts")
        .update({ 
          completed_at: new Date().toISOString(),
          attempt_number: finalAttemptNumber, // Set correct attempt number when completing
        })
        .eq("id", quizAttempt.id)
        .select()
        .single()
      
      if (updateAttemptError) {
        logWarning("Could not mark quiz attempt as completed", {
          component: "courses/[id]/quiz-results/route",
          action: "POST",
          error: updateAttemptError,
          attemptId,
        })
      } else {
        logInfo("Quiz attempt marked as completed - this attempt now counts toward max attempts", { 
          attemptId, 
          attemptNumber: finalAttemptNumber,
          previousAttemptNumber: quizAttempt.attempt_number,
          highestCompletedAttemptNumber,
          lessonId 
        })
        attemptId = updatedAttempt?.id || attemptId
        attemptNumber = finalAttemptNumber
      }
    } else if (!quizAttempt) {
      // No attempt exists - this means "Finish Quiz" was clicked on first attempt
      // Create a new attempt record now (this is when the attempt counts toward max attempts)
      // Calculate the next attempt number based on completed attempts
      const { data: completedAttempts, error: completedAttemptsError } = await serviceSupabase
        .from("quiz_attempts")
        .select("attempt_number")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .not("completed_at", "is", null)
        .order("attempt_number", { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (completedAttemptsError && completedAttemptsError.code !== 'PGRST116') {
        logWarning("Error fetching completed attempts", {
          component: "courses/[id]/quiz-results/route",
          action: "POST",
          error: completedAttemptsError,
          lessonId,
        })
      }
      
      // Calculate next attempt number
      attemptNumber = completedAttempts?.attempt_number 
        ? (completedAttempts.attempt_number + 1) 
        : 1
      
      // Generate seed for shuffling (should match what was used when quiz was loaded)
      const { generateSeed } = await import("@/lib/quiz/shuffle")
      const seed = generateSeed(user.id, lessonId, attemptNumber)
      const { shuffleQuiz } = await import("@/lib/quiz/shuffle")
      const { shuffledQuestions, questionOrder: calculatedQuestionOrder, answerOrders } = shuffleQuiz(quizQuestions, seed)
      
      // Create new attempt record - this is when the attempt counts toward max attempts
      const { data: newAttempt, error: insertAttemptError } = await serviceSupabase
        .from("quiz_attempts")
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          attempt_number: attemptNumber,
          question_order: calculatedQuestionOrder,
          answer_orders: answerOrders,
          completed_at: new Date().toISOString(), // Mark as completed immediately since quiz is being submitted
        })
        .select()
        .single()
      
      if (insertAttemptError) {
        logError("Error creating quiz attempt", insertAttemptError, {
          component: "courses/[id]/quiz-results/route",
          action: "POST",
          lessonId,
          courseId,
        })
        // Continue without attempt ID - quiz results can still be saved
      } else {
        attemptId = newAttempt?.id || null
        logInfo("New quiz attempt created and marked as completed - this attempt now counts toward max attempts", { 
          attemptId, 
          attemptNumber, 
          lessonId 
        })
      }
    }

    // If shuffled, we need to reconstruct the shuffled questions that user saw
    // NOTE: Only questions are shuffled, NOT answers - answers stay in original order
    let shuffledQuestionsForComparison: any[] = quizQuestions
    let originalQuestions: any[] = quizQuestions
    
    if (hasShuffle && questionOrder) {
      // Reconstruct question order (questions are shuffled, but answers within each question are NOT)
      const questionMap = new Map(quizQuestions.map((q: any) => [q.dbId || parseInt(String(q.id)) || 0, q]))
      originalQuestions = questionOrder.map((originalId: number) => questionMap.get(originalId)).filter(Boolean)
      
      // Questions are in shuffled order, but answers within each question are NOT shuffled
      // So we just reorder the questions, keeping their original options and correctOption
      shuffledQuestionsForComparison = originalQuestions
    }

    // Process and save each answer
    const resultsToInsert = []
    let correctCount = 0
    let totalPoints = 0
    let pointsEarned = 0

    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i]
      let question = null
      let originalQuestion: any = null
      
      // If shuffled, questions are in shuffled order, so use index directly
      if (hasShuffle && questionOrder && i < questionOrder.length && i < shuffledQuestionsForComparison.length) {
        // Question at index i in shuffled order (with shuffled correctOption)
        question = shuffledQuestionsForComparison[i]
        // Find original question for mapping back
        const shuffledQuestionId = questionOrder[i]
        originalQuestion = quizQuestions.find((q: any) => {
          const qId = q.dbId || parseInt(String(q.id)) || 0
          return qId === shuffledQuestionId
        }) || question
      } else {
        // Not shuffled, match normally
        question = quizQuestions.find((q: any) => {
          return q.id === answer.questionId || 
                 String(q.id) === String(answer.questionId) ||
                 q.id?.toString() === answer.questionId?.toString()
        })
        
        originalQuestion = question
        
        // Fallback to index
        if (!question && i < quizQuestions.length) {
          logInfo(`Question ID ${answer.questionId} not found, using index ${i} as fallback`, { questionId: answer.questionId, index: i })
          question = quizQuestions[i]
          originalQuestion = question
        }
      }
      
      if (!question) {
        logError(`Question not found for answer ${i}`, new Error("Question not found"), {
          component: "courses/[id]/quiz-results/route",
          action: "POST",
          answerIndex: i,
          answer,
          availableQuestions: quizQuestions.length,
        })
        continue
      }
      
      // Use original question for getting question ID and other metadata
      const questionForMetadata = originalQuestion || question

      // Determine if answer is correct based on question type
      // Note: If shuffled, only questions are shuffled, NOT answers
      // Answers stay in original order, so we compare directly using original correctOption
      let isCorrect = false
      const qType = question.type || "multiple-choice" || "multiple_choice"
      
      if (qType === "multiple-choice" || qType === "multiple_choice") {
        // For multiple choice, compare with correctOption (already in shuffled position if shuffled)
        const correctAnswer = question.correctOption !== undefined ? question.correctOption : question.correct_answer
        isCorrect = correctAnswer === answer.userAnswer
        logInfo(`Question ${i} (multiple-choice)`, { correctAnswer, userAnswer: answer.userAnswer, isCorrect })
      } else if (qType === "true-false" || qType === "true_false") {
        const correctAnswer = question.correctOption !== undefined ? question.correctOption : question.correct_answer
        isCorrect = correctAnswer === answer.userAnswer
      } else if (qType === "fill-blank" || qType === "fill_blank") {
        const correctAnswers = Array.isArray(question.correctAnswers)
          ? question.correctAnswers
          : (question.correct_answers ? (Array.isArray(question.correct_answers) ? question.correct_answers : [question.correct_answers]) : [])
        isCorrect = correctAnswers.some(
          (ca: any) => ca.toString().toLowerCase() === answer.userAnswer?.toString().toLowerCase()
        )
      } else if (qType === "short-answer" || qType === "short_answer") {
        // For short answer, check if user answer contains keywords
        const correctKeywords = Array.isArray(question.correctKeywords)
          ? question.correctKeywords
          : (question.correct_keywords ? (Array.isArray(question.correct_keywords) ? question.correct_keywords : [question.correct_keywords]) : [])
        const userAnswerLower = answer.userAnswer?.toString().toLowerCase() || ""
        isCorrect = correctKeywords.some((keyword: any) =>
          userAnswerLower.includes(keyword.toString().toLowerCase())
        )
      } else {
        // For essay and other types, default to false or handle differently
        isCorrect = false
      }

      if (isCorrect) correctCount++

      // Get points from question (default to 1 if not specified)
      const questionPoints = question.points || 1
      const earnedPoints = isCorrect ? questionPoints : 0
      
      totalPoints += questionPoints
      pointsEarned += earnedPoints

      // Answers are NOT shuffled - use answer directly (no mapping needed)
      // Use database ID (integer) for quiz_question_id - required for foreign key
      const questionDbId = questionForMetadata.dbId || (typeof questionForMetadata.id === 'number' ? questionForMetadata.id : parseInt(String(questionForMetadata.id || answer.questionId)) || null)
      
      if (!questionDbId) {
        logError(`Cannot determine database ID for question`, new Error("Question ID not found"), {
          component: "courses/[id]/quiz-results/route",
          action: "POST",
          questionId: answer.questionId,
          question: questionForMetadata,
          answerIndex: i,
        })
        continue // Skip this result if we can't determine the question ID
      }
      
      // Convert user_answer to string for storage (database expects text)
      // Answers are NOT shuffled, so use answer.userAnswer directly
      const userAnswerText = answer.userAnswer !== null && answer.userAnswer !== undefined 
        ? String(answer.userAnswer) 
        : null
      
      resultsToInsert.push({
        user_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        quiz_question_id: questionDbId, // Must be integer (foreign key to quiz_questions.id)
        attempt_id: attemptId, // Reference to quiz_attempts
        shuffled_question_order: hasShuffle && questionOrder ? questionOrder : null, // Denormalized for instant display
        shuffled_answer_orders: null, // Answers are NOT shuffled - always null
        user_answer: userAnswerText, // Mapped back to original position, stored as text
        is_correct: isCorrect,
        score: earnedPoints,
      })
    }

    // Delete existing quiz results for this user+lesson to avoid duplicates on retake
    const { error: deleteError } = await serviceSupabase
      .from("quiz_results")
      .delete()
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)

    if (deleteError) {
      logWarning("Could not delete old quiz results", {
        component: "courses/[id]/quiz-results/route",
        action: "POST",
        error: deleteError,
        lessonId,
      })
    } else {
      logInfo("Deleted previous quiz results for this lesson", { lessonId })
    }

    // Insert all quiz results using service role to bypass RLS
    if (resultsToInsert.length === 0) {
      logWarning("No quiz results to insert - all questions may have been skipped", {
        component: "courses/[id]/quiz-results/route",
        action: "POST",
        lessonId,
      })
      return NextResponse.json({
        error: "No valid quiz results to save",
        message: "Could not process quiz answers"
      }, { status: 400 })
    }

    const { data: insertedResults, error: insertError } = await serviceSupabase
      .from("quiz_results")
      .insert(resultsToInsert)
      .select()

    if (insertError) {
      logError("Error inserting quiz results", insertError, {
        component: "courses/[id]/quiz-results/route",
        action: "POST",
        lessonId,
        resultsCount: resultsToInsert.length,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        resultsToInsertCount: resultsToInsert.length,
        firstResult: resultsToInsert[0],
      })
      return NextResponse.json({
        error: "Failed to save quiz results",
        message: insertError.message || "Database error occurred",
        details: insertError.details,
      }, { status: 500 })
    } else {
      logInfo("Quiz results saved successfully", {
        recordsCount: insertedResults?.length || 0,
        lessonId: lessonId,
        courseId: courseId,
        userId: user.id,
      })
    }

    // Calculate overall score based on points
    const totalQuestions = answers.length
    const overallScore = totalPoints > 0 ? (pointsEarned / totalPoints) * 100 : 0

    return NextResponse.json({
      message: "Quiz completed successfully",
      results: insertedResults || [],
      stats: {
        totalQuestions,
        correctAnswers: correctCount,
        incorrectAnswers: totalQuestions - correctCount,
        totalPoints,
        pointsEarned,
        overallScore: Math.round(overallScore * 100) / 100,
      },
    })
  } catch (error: any) {
    logError("Error processing quiz results", error, {
      component: "courses/[id]/quiz-results/route",
      action: "POST",
    })
    return NextResponse.json(
      createErrorResponse(error, 500, { component: "courses/[id]/quiz-results/route", action: "POST" }),
      { status: 500 }
    )
  }
}

