import { useQuery } from "@tanstack/react-query"

export interface PlatformSettings {
  default_currency?: string
  platform_name?: string
  platform_description?: string
}

// Fetch platform settings (available to all users)
export function usePlatformSettings() {
  return useQuery<PlatformSettings>({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const response = await fetch("/api/platform-settings")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch platform settings")
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}