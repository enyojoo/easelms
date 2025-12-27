import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface Profile {
  id: string
  name: string
  email: string
  profile_image?: string
  bio?: string
  currency?: string
  user_type?: string
}

interface ProfileResponse {
  profile: Profile
}

// Fetch user profile
export function useProfile() {
  return useQuery<ProfileResponse>({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await fetch("/api/profile")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch profile")
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change frequently
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
  })
}

// Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (profileData: {
      name?: string
      email?: string
      bio?: string
      profile_image?: string
      currency?: string
    }) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update profile")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
    },
  })
}

// Invalidate profile cache
export function useInvalidateProfile() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["profile"] })
  }
}

