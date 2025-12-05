export const users: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "user@example.com",
    userType: "user",
    enrolledCourses: [1, 2],
    progress: { 1: 60, 2: 30 },
    completedCourses: [],
    achievements: ["First Login", "Course Started"],
    profileImage:
      "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    currency: "USD",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "admin@example.com",
    userType: "admin",
    enrolledCourses: [],
    progress: {},
    completedCourses: [],
    achievements: ["Course Created"],
    profileImage: "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=600",
    currency: "USD",
  },
]

export function getUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email === email)
}

export type UserType = "user" | "admin"

export interface User {
  id: string
  name: string
  email: string
  userType: UserType
  enrolledCourses: number[]
  progress: { [courseId: number]: number }
  completedCourses: number[]
  achievements: string[]
  profileImage: string
  currency: string
}
