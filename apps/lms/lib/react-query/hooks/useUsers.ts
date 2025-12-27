import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface PlatformUser {
  id: string
  name: string
  email: string
  enrolledCoursesCount: number
  completedCoursesCount: number
  created_at: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  user_type: "admin" | "instructor"
}

interface UsersResponse {
  users: PlatformUser[] | TeamMember[]
}

// Fetch platform users (regular users)
export function usePlatformUsers() {
  return useQuery<UsersResponse>({
    queryKey: ["platformUsers"],
    queryFn: async () => {
      const response = await fetch("/api/users?userType=user")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch users")
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  })
}

// Fetch team members (admins and instructors)
export function useTeamMembers() {
  return useQuery<UsersResponse>({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      const response = await fetch("/api/users?userType=admin")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch team members")
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  })
}

// Create team member mutation
export function useCreateTeamMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; userType: "admin" | "instructor" }) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create team member")
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] })
    },
  })
}

// Delete user mutation
export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete user")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformUsers"] })
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] })
    },
  })
}

