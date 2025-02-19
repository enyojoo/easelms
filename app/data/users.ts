// Update the instructor's profile image
export interface User {
  id: string | number
  name: string
  email: string
  userType: "learner" | "instructor"
  enrolledCourses: number[]
  progress?: { [courseId: number]: number }
  completedCourses: number[]
  achievements?: string[]
  profileImage?: string
  currency?: string
  courses?: number[]
}

export const users: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    userType: "learner",
    enrolledCourses: [1, 2],
    progress: { 1: 30, 2: 15 },
    completedCourses: [],
    achievements: ["First Login", "Course Started"],
    profileImage:
      "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    currency: "USD",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    userType: "instructor",
    courses: [1, 2],
    completedCourses: [],
    achievements: ["Course Created"],
    profileImage: "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=600",
    currency: "USD",
  },
]

export function getUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email === email)
}

