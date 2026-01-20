import { useEnhancedQuery, cacheUtils } from "@/lib/cache/react-query-integration"

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

// Fetch user purchases with enhanced caching
export function usePurchases(options?: { all?: boolean }) {
  return useEnhancedQuery<PurchasesResponse>(
    ["purchases", options],
    async () => {
      const params = new URLSearchParams()
      if (options?.all) params.append("all", "true")

      const response = await fetch(`/api/purchases?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch purchases")
      }
      return response.json()
    },
    {
      cache: {
        ttl: 15 * 60 * 1000, // 15 minutes for purchases (they change less frequently)
        version: '1.0',
        compress: true, // Compress purchase data
        priority: 'high' // High priority - important user data
      },
      enablePersistence: true
    }
  )
}

// Invalidate purchases cache
export function useInvalidatePurchases() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["purchases"] })
  }
}

