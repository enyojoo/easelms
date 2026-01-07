import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface PlatformSettings {
  default_currency?: string
  course_enrollment_notifications?: boolean
  course_completion_notifications?: boolean
  platform_announcements?: boolean
  user_email_notifications?: boolean
  // Brand settings
  platform_name?: string
  platform_description?: string
  logo_black?: string
  logo_white?: string
  favicon?: string
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  seo_image?: string
}

interface SettingsResponse {
  platformSettings: PlatformSettings | null
  userSettings?: any
}

// Fetch platform settings (admin only)
export function useSettings() {
  return useQuery<SettingsResponse>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch settings")
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - settings don't change frequently
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
  })
}

// Update platform settings
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (settings: { platformSettings?: PlatformSettings; userSettings?: any }) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update settings")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
    },
  })
}

// Invalidate settings cache
export function useInvalidateSettings() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["settings"] })
  }
}
