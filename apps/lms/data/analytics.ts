export interface AnalyticsData {
  date: string
  revenue?: number
  enrollments?: number
  completions?: number
  activeUsers?: number
}

export interface CourseAnalytics {
  courseId: number
  courseTitle: string
  totalEnrollments: number
  totalCompletions: number
  completionRate: number
  averageProgress: number
  totalRevenue: number
  averageRating?: number
}

export interface UserAnalytics {
  userId: string
  totalCoursesEnrolled: number
  totalCoursesCompleted: number
  totalTimeSpent: number // in seconds
  averageProgress: number
  certificatesEarned: number
}

// Mock analytics data for charts
export const revenueData: AnalyticsData[] = [
  { date: "2024-01-01", revenue: 1200, enrollments: 15, completions: 5, activeUsers: 50 },
  { date: "2024-01-08", revenue: 1900, enrollments: 22, completions: 8, activeUsers: 65 },
  { date: "2024-01-15", revenue: 3000, enrollments: 35, completions: 12, activeUsers: 80 },
  { date: "2024-01-22", revenue: 2500, enrollments: 28, completions: 10, activeUsers: 75 },
  { date: "2024-01-29", revenue: 3200, enrollments: 40, completions: 15, activeUsers: 90 },
]

export const learnerGrowthData: AnalyticsData[] = [
  { date: "2024-01-01", activeUsers: 100 },
  { date: "2024-01-08", activeUsers: 150 },
  { date: "2024-01-15", activeUsers: 200 },
  { date: "2024-01-22", activeUsers: 250 },
  { date: "2024-01-29", activeUsers: 300 },
]

export const courseAnalytics: CourseAnalytics[] = [
  {
    courseId: 1,
    courseTitle: "Digital Marketing & Social Media",
    totalEnrollments: 1250,
    totalCompletions: 980,
    completionRate: 78.4,
    averageProgress: 65.5,
    totalRevenue: 122500,
    averageRating: 4.5,
  },
  {
    courseId: 2,
    courseTitle: "Startup Fundamentals",
    totalEnrollments: 980,
    totalCompletions: 720,
    completionRate: 73.5,
    averageProgress: 58.2,
    totalRevenue: 96040,
    averageRating: 4.3,
  },
  {
    courseId: 3,
    courseTitle: "Basic Money Management",
    totalEnrollments: 550,
    totalCompletions: 450,
    completionRate: 81.8,
    averageProgress: 72.1,
    totalRevenue: 26950,
    averageRating: 4.7,
  },
]

export const userAnalytics: UserAnalytics[] = [
  {
    userId: "1",
    totalCoursesEnrolled: 2,
    totalCoursesCompleted: 0,
    totalTimeSpent: 5100,
    averageProgress: 45.0,
    certificatesEarned: 0,
  },
  {
    userId: "2",
    totalCoursesEnrolled: 1,
    totalCoursesCompleted: 1,
    totalTimeSpent: 7200,
    averageProgress: 100.0,
    certificatesEarned: 1,
  },
]

export function getCourseAnalytics(courseId: number): CourseAnalytics | undefined {
  return courseAnalytics.find((a) => a.courseId === courseId)
}

export function getUserAnalytics(userId: string): UserAnalytics | undefined {
  return userAnalytics.find((a) => a.userId === userId)
}

export function getTotalRevenue(): number {
  return revenueData.reduce((sum, d) => sum + (d.revenue || 0), 0)
}

export function getTotalEnrollments(): number {
  return revenueData.reduce((sum, d) => sum + (d.enrollments || 0), 0)
}

export function getTotalCompletions(): number {
  return revenueData.reduce((sum, d) => sum + (d.completions || 0), 0)
}

