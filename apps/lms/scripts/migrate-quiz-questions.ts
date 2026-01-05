/**
 * Migration script to move quiz questions from JSONB to quiz_questions table
 * 
 * This script:
 * 1. Extracts questions from lessons.content.quiz.questions
 * 2. Creates records in quiz_questions table
 * 3. Updates quiz_results to use new integer IDs
 * 
 * Run with: npx tsx scripts/migrate-quiz-questions.ts
 */

import { createServiceRoleClient } from "../lib/supabase/server"

interface Question {
  id: string
  type: string
  text: string
  options?: string[]
  correctOption?: number
  correctAnswer?: boolean | number
  correctAnswers?: string[]
  correctKeywords?: string[]
  points?: number
  explanation?: string
  difficulty?: string
  timeLimit?: number
  imageUrl?: string
  [key: string]: any
}

async function migrateQuizQuestions() {
  console.log("🚀 Starting quiz questions migration...")
  
  const supabase = createServiceRoleClient()
  
  try {
    // Step 1: Get all lessons with quiz questions
    console.log("📖 Fetching lessons with quiz questions...")
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, content")
      .not("content", "is", null)
    
    if (lessonsError) {
      throw new Error(`Failed to fetch lessons: ${lessonsError.message}`)
    }
    
    if (!lessons || lessons.length === 0) {
      console.log("✅ No lessons found. Migration complete.")
      return
    }
    
    console.log(`📚 Found ${lessons.length} lessons to process`)
    
    let totalQuestionsMigrated = 0
    let totalLessonsProcessed = 0
    let totalErrors = 0
    
    // Step 2: Process each lesson
    for (const lesson of lessons) {
      try {
        const content = typeof lesson.content === 'string' 
          ? JSON.parse(lesson.content) 
          : lesson.content
        
        if (!content?.quiz?.questions || !Array.isArray(content.quiz.questions)) {
          continue
        }
        
        const questions: Question[] = content.quiz.questions
        if (questions.length === 0) {
          continue
        }
        
        console.log(`\n📝 Processing lesson ${lesson.id} with ${questions.length} questions`)
        
        // Step 3: Insert questions into quiz_questions table
        const questionsToInsert = questions.map((q, index) => {
          // Extract question data based on type
          const questionData: any = {}
          
          if (q.type === "multiple-choice") {
            questionData.options = q.options || []
            questionData.correctOption = q.correctOption ?? 0
            questionData.allowMultipleCorrect = q.allowMultipleCorrect || false
            questionData.partialCredit = q.partialCredit || false
          } else if (q.type === "true-false") {
            questionData.correctAnswer = q.correctAnswer ?? true
          } else if (q.type === "fill-blank") {
            questionData.correctAnswers = q.correctAnswers || []
            questionData.caseSensitive = q.caseSensitive || false
          } else if (q.type === "short-answer") {
            questionData.correctKeywords = q.correctKeywords || []
            questionData.caseSensitive = q.caseSensitive || false
          } else if (q.type === "essay") {
            questionData.wordLimit = q.wordLimit
            questionData.rubric = q.rubric
          } else if (q.type === "matching") {
            questionData.leftItems = q.leftItems || []
            questionData.rightItems = q.rightItems || []
            questionData.correctMatches = q.correctMatches || []
          }
          
          return {
            lesson_id: lesson.id,
            question_type: q.type || "multiple-choice",
            question_text: q.text || "",
            question_data: questionData,
            points: q.points ?? 1,
            explanation: q.explanation || null,
            difficulty: q.difficulty || null,
            time_limit: q.timeLimit || null,
            image_url: q.imageUrl || null,
            order_index: index,
          }
        })
        
        // Insert questions
        const { data: insertedQuestions, error: insertError } = await supabase
          .from("quiz_questions")
          .insert(questionsToInsert)
          .select("id, order_index")
        
        if (insertError) {
          console.error(`❌ Error inserting questions for lesson ${lesson.id}:`, insertError)
          totalErrors++
          continue
        }
        
        if (!insertedQuestions || insertedQuestions.length === 0) {
          console.warn(`⚠️  No questions inserted for lesson ${lesson.id}`)
          continue
        }
        
        console.log(`✅ Inserted ${insertedQuestions.length} questions for lesson ${lesson.id}`)
        totalQuestionsMigrated += insertedQuestions.length
        
        // Step 4: Update quiz_results to use new integer IDs
        // Create a mapping from old string ID to new integer ID
        const idMapping: { [oldId: string]: number } = {}
        questions.forEach((q, index) => {
          const newQuestion = insertedQuestions.find(iq => iq.order_index === index)
          if (newQuestion && q.id) {
            idMapping[q.id] = newQuestion.id
          }
        })
        
        if (Object.keys(idMapping).length > 0) {
          // Update quiz_results for this lesson
          for (const [oldId, newId] of Object.entries(idMapping)) {
            const { error: updateError } = await supabase
              .from("quiz_results")
              .update({ quiz_question_id_new: newId })
              .eq("lesson_id", lesson.id)
              .eq("quiz_question_id", oldId)
            
            if (updateError) {
              console.warn(`⚠️  Error updating quiz_results for question ${oldId}:`, updateError)
            }
          }
        }
        
        totalLessonsProcessed++
        
      } catch (error: any) {
        console.error(`❌ Error processing lesson ${lesson.id}:`, error.message)
        totalErrors++
      }
    }
    
    console.log("\n" + "=".repeat(50))
    console.log("📊 Migration Summary:")
    console.log(`   Lessons processed: ${totalLessonsProcessed}`)
    console.log(`   Questions migrated: ${totalQuestionsMigrated}`)
    console.log(`   Errors: ${totalErrors}`)
    console.log("=".repeat(50))
    
    // Step 5: Final migration step - update quiz_results to use new column
    console.log("\n🔄 Updating quiz_results table...")
    
    // Copy data from quiz_question_id_new to quiz_question_id (after verifying)
    // Note: This step should be done carefully after verifying the migration
    console.log("✅ Migration complete! Next steps:")
    console.log("   1. Verify the data in quiz_questions table")
    console.log("   2. Run: ALTER TABLE quiz_results DROP COLUMN quiz_question_id;")
    console.log("   3. Run: ALTER TABLE quiz_results RENAME COLUMN quiz_question_id_new TO quiz_question_id;")
    console.log("   4. Add foreign key constraint (see migration SQL)")
    
  } catch (error: any) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

// Run migration
migrateQuizQuestions()
  .then(() => {
    console.log("\n✅ Migration script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Migration script failed:", error)
    process.exit(1)
  })
