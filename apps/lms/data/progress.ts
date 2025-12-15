export interface LessonProgress {
  id: string
  userId: string
  courseId: number
  lessonId: string
  completed: boolean
  completedAt?: Date
  timeSpent: number // in seconds
  quizScore?: number
  quizAttempts: number
}

export interface CourseProgress {
  userId: string
  courseId: number
  overallProgress: number // percentage
  lessonsCompleted: number
  totalLessons: number
  timeSpent: number // total time in seconds
  lastAccessedAt: Date
}

export const lessonProgress: LessonProgress[] = [
  {
    id: "1",
    userId: "1",
    courseId: 1,
    lessonId: "lesson-1",
    completed: true,
    completedAt: new Date("2024-01-16"),
    timeSpent: 1200,
    quizScore: 85,
    quizAttempts: 1,
  },
  {
    id: "2",
    userId: "1",
    courseId: 1,
    lessonId: "lesson-2",
    completed: true,
    completedAt: new Date("2024-01-17"),
    timeSpent: 1500,
    quizScore: 90,
    quizAttempts: 1,
  },
  {
    id: "3",
    userId: "1",
    courseId: 1,
    lessonId: "lesson-3",
    completed: false,
    timeSpent: 600,
    quizAttempts: 0,
  },
]

export const courseProgress: CourseProgress[] = [
  {
    userId: "1",
    courseId: 1,
    overallProgress: 60,
    lessonsCompleted: 2,
    totalLessons: 5,
    timeSpent: 3300,
    lastAccessedAt: new Date("2024-01-20"),
  },
  {
    userId: "1",
    courseId: 2,
    overallProgress: 30,
    lessonsCompleted: 1,
    totalLessons: 4,
    timeSpent: 1800,
    lastAccessedAt: new Date("2024-01-18"),
  },
]

export function getProgressByUser(userId: string): CourseProgress[] {
  return courseProgress.filter((p) => p.userId === userId)
}

export function getProgressByCourse(courseId: number): CourseProgress[] {
  return courseProgress.filter((p) => p.courseId === courseId)
}

export function getLessonProgress(userId: string, courseId: number, lessonId: string): LessonProgress | undefined {
  return lessonProgress.find(
    (p) => p.userId === userId && p.courseId === courseId && p.lessonId === lessonId
  )
}

