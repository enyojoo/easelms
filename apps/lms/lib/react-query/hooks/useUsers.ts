import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppQuery } from "./useAppCache"

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
// Uses useAppQuery for unified caching and localStorage persistence
export function usePlatformUsers() {
  return useAppQuery<UsersResponse>(
    'platformUsers',
    ["platformUsers"],
    async () => {
      const response = await fetch("/api/users?userType=user")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch users")
      }
      return response.json()
    }
  )
  // Note: Uses 'admin' config (2 min staleTime) from cache-config.ts
  // localStorage persistence ensures instant data display on remount
}

// Fetch team members (admins and instructors)
// Uses useAppQuery for unified caching and localStorage persistence
export function useTeamMembers() {
  return useAppQuery<UsersResponse>(
    'teamMembers',
    ["teamMembers"],
    async () => {
      const response = await fetch("/api/users?userType=admin")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch team members")
      }
      return response.json()
    }
  )
  // Note: Uses 'admin' config (2 min staleTime) from cache-config.ts
  // localStorage persistence ensures instant data display on remount
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

