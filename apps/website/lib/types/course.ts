export interface Lesson {
  id?: string | number
  title: string
  type?: string
  content?: {
    url?: string
    text?: string
    [key: string]: any
  }
  quiz?: {
    questions: QuizQuestion[]
  }
  resources?: Resource[]
  settings?: {
    isRequired?: boolean
    videoProgression?: boolean
  }
}

export interface QuizQuestion {
  id: string | number
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

export interface Resource {
  title: string
  type: string
  url?: string
}

export interface Module {
  id: number
  title: string
  description: string
  image: string
  lessons: Lesson[]
  price?: number
  currency?: string
  enrolledStudents?: number
  requirements?: string
  whoIsThisFor?: string
  previewVideo?: string
  settings?: {
    isPublished?: boolean
    requiresSequentialProgress?: boolean
    minimumQuizScore?: number
    enrollment?: {
      enrollmentMode: "open" | "free" | "buy" | "recurring" | "closed"
      price?: number
      recurringPrice?: number
    }
    certificate?: {
      certificateEnabled?: boolean
      certificateTemplate?: string
      certificateTitle?: string
      certificateDescription?: string
      signatureImage?: string
      signatureTitle?: string
      additionalText?: string
      certificateType?: "completion" | "participation"
    }
  }
  totalHours?: number
  totalDurationMinutes?: number
  prerequisites?: Array<{
    id: number
    title: string
    image?: string
  }>
  instructors?: Array<{
    name: string
    profileImage?: string
    bio?: string
    title?: string
  }>
  creator?: {
    id: string
    name: string
    email: string
    profile_image?: string
    bio?: string
    user_type?: string
  }
}

export interface CoursesResponse {
  courses: Module[]
}

export interface CourseResponse {
  course: Module
}