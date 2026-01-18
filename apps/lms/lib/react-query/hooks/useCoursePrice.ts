import { useSettings, useProfile } from "./index"
import { convertCurrency } from "@/lib/payments/currency"
import { formatCurrency } from "@/lib/utils/currency"
import { useQuery } from "@tanstack/react-query"

export interface CoursePriceInfo {
  originalPrice: number
  originalCurrency: string
  displayPrice: number
  displayCurrency: string
  formattedDisplayPrice: string
}

/**
 * Hook for consistent course price display with currency conversion
 * Converts from platform currency to user's display currency
 */
export function useCoursePrice(coursePrice: number): CoursePriceInfo | undefined {
  const { data: settings } = useSettings()
  const { data: profile } = useProfile()

  // Get platform currency (where course prices are stored)
  const platformCurrency = settings?.platformSettings?.default_currency || "USD"

  // Get user's display currency preference
  const userCurrency = profile?.profile?.currency || "USD"

  // Only enable query when we have valid data and coursePrice > 0
  const isEnabled = !!settings && !!profile && coursePrice > 0

  // Use useQuery to handle the async conversion
  const { data: conversionData } = useQuery({
    queryKey: ["course-price", coursePrice, platformCurrency, userCurrency],
    queryFn: async () => {
      const displayPrice = await convertCurrency(coursePrice, platformCurrency, userCurrency)
      const formattedDisplayPrice = formatCurrency(displayPrice, userCurrency)

      return {
        originalPrice: coursePrice,
        originalCurrency: platformCurrency,
        displayPrice,
        displayCurrency: userCurrency,
        formattedDisplayPrice,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isEnabled,
  })

  // Return a loading state when disabled
  if (!isEnabled) {
    return undefined
  }

  return conversionData
}

/**
 * Hook for purchase price display (shows the actual amount paid)
 */
export function usePurchasePrice(purchase: {
  amount: number
  currency: string
}): { formattedPrice: string } {
  return {
    formattedPrice: formatCurrency(purchase.amount, purchase.currency),
  }
}