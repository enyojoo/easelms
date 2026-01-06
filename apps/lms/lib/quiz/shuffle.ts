/**
 * Quiz Shuffle Utilities
 * Provides seeded shuffling for questions and answers to prevent answer sharing
 */

/**
 * Seeded random number generator
 * Uses a simple LCG (Linear Congruential Generator) for deterministic randomness
 */
class SeededRandom {
  private seed: number

  constructor(seed: string) {
    // Convert string seed to number
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    this.seed = Math.abs(hash) || 1
  }

  next(): number {
    // LCG parameters (same as used in many programming languages)
    this.seed = (this.seed * 1664525 + 1013904223) % 2 ** 32
    return this.seed / 2 ** 32
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max)
  }
}

/**
 * Generate a unique seed for shuffling
 * Combines user ID, lesson ID, and attempt number for uniqueness
 */
export function generateSeed(userId: string, lessonId: number, attemptNumber: number): string {
  return `${userId}-${lessonId}-${attemptNumber}-${Date.now()}`
}

/**
 * Shuffle an array using Fisher-Yates algorithm with seeded randomness
 * Returns the shuffled array and the mapping of original indices
 */
export function seededShuffle<T>(array: T[], seed: string): {
  shuffled: T[]
  order: number[] // Original indices in shuffled order
} {
  if (array.length === 0) {
    return { shuffled: [], order: [] }
  }

  const rng = new SeededRandom(seed)
  const shuffled = [...array]
  const order = array.map((_, i) => i)

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1)
    // Swap elements (using temporary variables to avoid destructuring issues)
    const tempShuffled = shuffled[i]
    const tempOrder = order[i]
    shuffled[i] = shuffled[j]
    order[i] = order[j]
    shuffled[j] = tempShuffled
    order[j] = tempOrder
  }

  return { shuffled, order }
}

/**
 * Shuffle questions array
 * Returns shuffled questions and the order mapping
 */
export function shuffleQuestions<T extends { id: string | number }>(
  questions: T[],
  seed: string
): {
  shuffled: T[]
  questionOrder: number[] // Original question IDs in shuffled order
} {
  const { shuffled, order } = seededShuffle(questions, seed)
  const questionOrder = order.map((originalIndex) => {
    const question = questions[originalIndex]
    return typeof question.id === 'number' ? question.id : parseInt(String(question.id)) || originalIndex
  })

  return { shuffled, questionOrder }
}

/**
 * Shuffle answer options for a single question
 * Returns shuffled question with updated correctOption index
 */
export function shuffleAnswers<T extends {
  id: string | number
  options: string[]
  correctOption: number
  [key: string]: any
}>(
  question: T,
  seed: string
): {
  shuffled: T
  answerOrder: number[] // Original option indices in shuffled order
} {
  if (!question.options || question.options.length === 0) {
    return { shuffled: question, answerOrder: [] }
  }

  const { shuffled: shuffledOptions, order: answerOrder } = seededShuffle(question.options, `${seed}-${question.id}`)

  // Find new position of correct answer
  const originalCorrectIndex = question.correctOption
  const newCorrectIndex = answerOrder.indexOf(originalCorrectIndex)

  // Create shuffled question
  const shuffled = {
    ...question,
    options: shuffledOptions,
    correctOption: newCorrectIndex >= 0 ? newCorrectIndex : question.correctOption,
  }

  return { shuffled, answerOrder }
}

/**
 * Shuffle all questions and their answers
 * Returns fully shuffled quiz with all mappings
 */
export function shuffleQuiz<T extends {
  id: string | number
  options: string[]
  correctOption: number
  [key: string]: any
}>(
  questions: T[],
  seed: string
): {
  shuffledQuestions: T[]
  questionOrder: number[]
  answerOrders: { [questionId: string]: number[] }
} {
  // First shuffle questions
  const { shuffled: shuffledQuestions, questionOrder } = shuffleQuestions(questions, seed)

  // Then shuffle answers for each question
  const answerOrders: { [questionId: string]: number[] } = {}
  const fullyShuffled = shuffledQuestions.map((question) => {
    const { shuffled, answerOrder } = shuffleAnswers(question, seed)
    const questionId = String(question.id)
    answerOrders[questionId] = answerOrder
    return shuffled
  })

  return {
    shuffledQuestions: fullyShuffled,
    questionOrder,
    answerOrders,
  }
}

/**
 * Map answer back to original position using shuffle mapping
 */
export function mapAnswerToOriginal(
  shuffledAnswerIndex: number,
  answerOrder: number[]
): number {
  if (!answerOrder || answerOrder.length === 0) {
    return shuffledAnswerIndex
  }
  return answerOrder[shuffledAnswerIndex] ?? shuffledAnswerIndex
}

/**
 * Map answer from original to shuffled position
 */
export function mapAnswerToShuffled(
  originalAnswerIndex: number,
  answerOrder: number[]
): number {
  if (!answerOrder || answerOrder.length === 0) {
    return originalAnswerIndex
  }
  return answerOrder.indexOf(originalAnswerIndex)
}
