export interface Enrollment {
  id: string
  userId: string
  courseId: number
  enrolledAt: Date
  status: "active" | "completed" | "cancelled"
  progress: number
  lastAccessedAt?: Date
}

export const enrollments: Enrollment[] = [
  {
    id: "1",
    userId: "1",
    courseId: 1,
    enrolledAt: new Date("2024-01-15"),
    status: "active",
    progress: 60,
    lastAccessedAt: new Date("2024-01-20"),
  },
  {
    id: "2",
    userId: "1",
    courseId: 2,
    enrolledAt: new Date("2024-01-10"),
    status: "active",
    progress: 30,
    lastAccessedAt: new Date("2024-01-18"),
  },
  {
    id: "3",
    userId: "2",
    courseId: 1,
    enrolledAt: new Date("2024-01-05"),
    status: "completed",
    progress: 100,
    lastAccessedAt: new Date("2024-01-25"),
  },
]

export function getEnrollmentsByUser(userId: string): Enrollment[] {
  return enrollments.filter((e) => e.userId === userId)
}

export function getEnrollmentsByCourse(courseId: number): Enrollment[] {
  return enrollments.filter((e) => e.courseId === courseId)
}

