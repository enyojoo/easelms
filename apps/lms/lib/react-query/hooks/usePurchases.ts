import { useQuery, useQueryClient } from "@tanstack/react-query"

export interface Purchase {
  id: string
  courseId: number
  courseTitle: string
  amount: number
  currency: string
  type: "one-time" | "recurring"
  status: "active" | "cancelled"
  purchasedAt?: string
  createdAt: string
  cancelledAt?: string
  recurringPrice?: number
}

interface PurchasesResponse {
  purchases: Purchase[]
}

// Fetch user purchases
export function usePurchases(options?: { all?: boolean }) {
  return useQuery<PurchasesResponse>({
    queryKey: ["purchases", options],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.all) params.append("all", "true")

      const response = await fetch(`/api/purchases?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch purchases")
      }
      const data = await response.json()

      // Cache in localStorage for better persistence
      try {
        localStorage.setItem('easelms_purchases', JSON.stringify(data))
      } catch (e) {
        // Ignore localStorage errors
      }

      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - purchases don't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: (previousData) => {
      // Try to get from localStorage if no previous data
      if (!previousData) {
        try {
          const cached = localStorage.getItem('easelms_purchases')
          return cached ? JSON.parse(cached) : undefined
        } catch (e) {
          return undefined
        }
      }
      return previousData
    },
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent loading states
    refetchOnMount: 'always', // Always refetch on mount but use cached data initially
  })
}

// Invalidate purchases cache
export function useInvalidatePurchases() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["purchases"] })
  }
}

