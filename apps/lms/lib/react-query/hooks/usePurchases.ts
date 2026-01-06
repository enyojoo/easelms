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
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - purchases don't change frequently
    placeholderData: (previousData) => previousData, // Keep showing previous data while refetching
  })
}

// Invalidate purchases cache
export function useInvalidatePurchases() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["purchases"] })
  }
}

