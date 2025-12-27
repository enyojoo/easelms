import { useQuery } from "@tanstack/react-query"

export interface AdminStats {
  totalLearners: number
  totalCourses: number
  totalEnrollments: number
  totalRevenue: number
  recentActivity: Array<{
    id: string
    type: "enrollment" | "completion" | "purchase"
    user: {
      id: string
      name: string
      email: string
    }
    course: {
      id: number
      title: string
    }
    timestamp: string
  }>
}

// Fetch admin dashboard stats
export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch admin stats")
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - stats can be slightly stale
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in background
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
  })
}

