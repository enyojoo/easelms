export type QuestionType = "multiple-choice" | "true-false" | "fill-blank" | "short-answer" | "essay" | "matching"

export interface BaseQuestion {
  id: string
  type: QuestionType
  text: string
  explanation?: string
  difficulty?: "easy" | "medium" | "hard"
  timeLimit?: number
  points: number
  imageUrl?: string
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple-choice"
  options: string[]
  correctOption: number
  allowMultipleCorrect?: boolean
  partialCredit?: boolean
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: "true-false"
  correctAnswer: boolean
}

export interface FillInBlankQuestion extends BaseQuestion {
  type: "fill-blank"
  correctAnswers: string[]
  caseSensitive?: boolean
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: "short-answer"
  correctKeywords: string[]
  caseSensitive?: boolean
}

export interface EssayQuestion extends BaseQuestion {
  type: "essay"
  wordLimit?: number
  rubric?: string
}

export interface MatchingQuestion extends BaseQuestion {
  type: "matching"
  leftItems: string[]
  rightItems: string[]
  correctMatches: Array<{ leftIndex: number; rightIndex: number }>
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | FillInBlankQuestion | ShortAnswerQuestion | EssayQuestion | MatchingQuestion

export interface Quiz {
  enabled: boolean
  questions: Question[]
  shuffleQuestions?: boolean
  shuffleAnswers?: boolean
  showResultsImmediately?: boolean
  allowMultipleAttempts?: boolean
  showCorrectAnswers?: boolean
}

