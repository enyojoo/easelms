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
    staleTime: Infinity, // Never consider data stale - settings don't change frequently
    gcTime: Infinity, // Keep cache forever - once loaded, always use it
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
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
    onSuccess: (data) => {
      // Update cache immediately with new data instead of invalidating
      // This prevents flickering to defaults
      queryClient.setQueryData(["settings"], data)
      // Also trigger a background refetch to ensure consistency
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
