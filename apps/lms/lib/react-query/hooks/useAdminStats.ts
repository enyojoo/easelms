import { useAppQuery } from "./useAppCache"

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
  return useAppQuery<AdminStats>(
    'adminStats',
    ["admin-stats"],
    async () => {
      const response = await fetch("/api/admin/stats")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch admin stats")
      }
      return response.json()
    }
  )
}

