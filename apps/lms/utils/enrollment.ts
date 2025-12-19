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
export function getPurchaseHistory(): Purchase[] {
  try {
    const purchases = localStorage.getItem("purchase-history")
    if (purchases) {
      return JSON.parse(purchases)
    }
  } catch (error) {
    console.error("Error getting purchase history:", error)
  }
  return []
}

/**
 * Add a purchase to history
 */
export function addPurchase(purchase: Omit<Purchase, "id" | "purchasedAt">): void {
  try {
    const purchases = getPurchaseHistory()
    const newPurchase: Purchase = {
      ...purchase,
      id: `purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      purchasedAt: new Date().toISOString(),
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
 * This is a stub - should be replaced with actual payment integration
 */
export function handleCoursePayment(
  courseId: number,
  enrollmentMode: "buy" | "recurring",
  price: number,
  recurringPrice?: number,
  courseTitle?: string
): Promise<boolean> {
  return new Promise((resolve) => {
    // TODO: Integrate with payment provider (Stripe, Flutterwave, etc.)
    // For now, show a confirmation dialog
    const confirmed = window.confirm(
      `This will ${enrollmentMode === "buy" ? "purchase" : "subscribe"} you to this course for $${enrollmentMode === "recurring" ? (recurringPrice || price) + "/month" : price}. Continue?`
    )

    if (confirmed) {
      // Simulate payment success and enroll user
      enrollInCourse(courseId).then((success) => {
        if (success) {
          // Add to purchase history
          addPurchase({
            courseId,
            courseTitle: courseTitle || `Course ${courseId}`,
            type: enrollmentMode,
            amount: enrollmentMode === "recurring" ? (recurringPrice || price) : price,
            currency: "USD",
            recurringPrice: enrollmentMode === "recurring" ? (recurringPrice || price) : undefined,
            status: "active",
          })
          
          alert("Payment successful! You are now enrolled in this course.")
          resolve(true)
        } else {
          alert("Payment failed. Please try again.")
          resolve(false)
        }
      })
    } else {
      resolve(false)
    }
  })
}

