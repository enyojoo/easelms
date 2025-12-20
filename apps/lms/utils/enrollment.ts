// Enrollment utility functions

export interface EnrollmentStatus {
  isEnrolled: boolean
  enrolledAt?: string
  status?: "active" | "completed" | "cancelled"
}

/**
 * Check if user is enrolled in a course
 * Checks both localStorage and user object from auth
 */
export function isEnrolledInCourse(courseId: number, user?: any): boolean {
  // Check user object first (from auth state)
  if (user?.enrolledCourses?.includes(courseId)) {
    return true
  }

  // Check localStorage as fallback
  try {
    const enrollments = localStorage.getItem("course-enrollments")
    if (enrollments) {
      const enrollmentList: number[] = JSON.parse(enrollments)
      return enrollmentList.includes(courseId)
    }
  } catch (error) {
    console.error("Error checking enrollment:", error)
  }

  return false
}

/**
 * Enroll user in a course (for free courses)
 */
export function enrollInCourse(courseId: number, user?: any): Promise<boolean> {
  return new Promise((resolve) => {
    // If user object exists, we should ideally call an API
    // For now, we'll use localStorage as a fallback
    try {
      // Update localStorage
      const enrollments = localStorage.getItem("course-enrollments")
      const enrollmentList: number[] = enrollments ? JSON.parse(enrollments) : []
      
      if (!enrollmentList.includes(courseId)) {
        enrollmentList.push(courseId)
        localStorage.setItem("course-enrollments", JSON.stringify(enrollmentList))
      }

      // TODO: Call API endpoint to enroll user
      // For now, we'll just use localStorage
      resolve(true)
    } catch (error) {
      console.error("Error enrolling in course:", error)
      resolve(false)
    }
  })
}

/**
 * Get all enrolled course IDs
 */
export function getEnrolledCourseIds(user?: any): number[] {
  // Check user object first
  if (user?.enrolledCourses && Array.isArray(user.enrolledCourses)) {
    return user.enrolledCourses
  }

  // Check localStorage as fallback
  try {
    const enrollments = localStorage.getItem("course-enrollments")
    if (enrollments) {
      return JSON.parse(enrollments)
    }
  } catch (error) {
    console.error("Error getting enrolled courses:", error)
  }

  return []
}

export interface Purchase {
  id: string
  userId?: string // Optional for backward compatibility
  courseId: number
  courseTitle: string
  type: "buy" | "recurring"
  amount: number
  currency: string
  recurringPrice?: number
  status: "active" | "cancelled" | "completed"
  purchasedAt: string
  cancelledAt?: string
}

/**
 * Get purchase history from localStorage
 */
export function getPurchaseHistory(userId?: string): Purchase[] {
  try {
    const purchases = localStorage.getItem("purchase-history")
    if (purchases) {
      const allPurchases: Purchase[] = JSON.parse(purchases)
      // If userId is provided, filter by userId
      if (userId) {
        return allPurchases.filter((p) => p.userId === userId)
      }
      return allPurchases
    }
  } catch (error) {
    console.error("Error getting purchase history:", error)
  }
  return []
}

/**
 * Add a purchase to history
 */
export function addPurchase(purchase: Omit<Purchase, "id" | "purchasedAt">, userId?: string): void {
  try {
    const purchases = getPurchaseHistory()
    const newPurchase: Purchase = {
      ...purchase,
      id: `purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      purchasedAt: new Date().toISOString(),
      userId: userId || purchase.userId,
    }
    purchases.push(newPurchase)
    localStorage.setItem("purchase-history", JSON.stringify(purchases))
  } catch (error) {
    console.error("Error adding purchase:", error)
  }
}

/**
 * Cancel a subscription
 */
export function cancelSubscription(purchaseId: string): void {
  try {
    const purchases = getPurchaseHistory()
    const updatedPurchases = purchases.map((purchase) => {
      if (purchase.id === purchaseId && purchase.type === "recurring" && purchase.status === "active") {
        return {
          ...purchase,
          status: "cancelled" as const,
          cancelledAt: new Date().toISOString(),
        }
      }
      return purchase
    })
    localStorage.setItem("purchase-history", JSON.stringify(updatedPurchases))
  } catch (error) {
    console.error("Error cancelling subscription:", error)
  }
}

/**
 * Handle payment/subscription for paid courses
 * Redirects to Stripe Checkout (hosted page) or Flutterwave payment link
 */
export function handleCoursePayment(
  courseId: number,
  enrollmentMode: "buy" | "recurring",
  price: number,
  recurringPrice?: number,
  courseTitle?: string,
  user?: any
): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      // Call API to create payment intent/checkout session
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          amountUSD: enrollmentMode === "recurring" ? (recurringPrice || price) : price,
          courseTitle: courseTitle || `Course ${courseId}`,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create payment session")
      }

      const data = await response.json()

      // Redirect to payment gateway
      if (data.gateway === "stripe" && data.checkoutUrl) {
        // Redirect to Stripe Checkout (hosted page)
        window.location.href = data.checkoutUrl
        // Note: The promise won't resolve until after redirect, but that's okay
        // The callback URL will handle enrollment
        resolve(true)
      } else if (data.gateway === "flutterwave" && data.paymentLink) {
        // Redirect to Flutterwave payment page
        window.location.href = data.paymentLink
        // Note: The promise won't resolve until after redirect, but that's okay
        // The callback URL will handle enrollment
        resolve(true)
      } else {
        throw new Error("Invalid payment gateway response")
      }
    } catch (error: any) {
      console.error("Error initiating payment:", error)
      alert(`Payment error: ${error.message || "Failed to initiate payment. Please try again."}`)
      reject(error)
    }
  })
}

