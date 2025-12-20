export const users: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "user@example.com",
    userType: "user",
    enrolledCourses: [1, 2],
    progress: { 1: 60, 2: 30 },
    completedCourses: [],
    profileImage:
      "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    currency: "USD",
  },
  {
    id: "2",
    name: "Dr Ifeoma Eze",
    email: "admin@example.com",
    userType: "admin",
    enrolledCourses: [],
    progress: {},
    completedCourses: [],
    profileImage: "https://www.pastorifeomaeze.com/wp-content/uploads/2020/01/Ifeoma-Eze.jpeg",
    bio: "",
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
  profileImage: string
  currency: string
  bio?: string
  website?: string
  twitter?: string
  linkedin?: string
  youtube?: string
  instagram?: string
}
