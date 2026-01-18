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
  return new Promise(async (resolve) => {
    try {
      // Call API endpoint to enroll user
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to enroll in course")
      }

      const data = await response.json()
      console.log("Enrolled successfully:", data)
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent("courseEnrolled", { detail: { courseId } }))
      
      resolve(true)
    } catch (error: any) {
      console.error("Error enrolling in course:", error)
      alert(`Enrollment error: ${error.message || "Failed to enroll. Please try again."}`)
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
  type: "buy"
  amount: number
  currency: string
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
 * Handle payment/subscription for paid courses
 * Redirects to Stripe Checkout (hosted page) or Flutterwave payment link
 */
export function handleCoursePayment(
  courseId: number,
  enrollmentMode: "buy",
  courseTitle?: string,
  user?: any,
  referrer?: "courses-list" | "course-detail"
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
          enrollmentMode,
          courseTitle: courseTitle || `Course ${courseId}`,
          referrer,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create payment session")
      }

      const data = await response.json()

      // Redirect to payment gateway (replace current history entry to prevent back button issues)
      if (data.gateway === "stripe" && data.checkoutUrl) {
        // Redirect to Stripe Checkout (hosted page)
        window.location.replace(data.checkoutUrl)
        // Note: The promise won't resolve until after redirect, but that's okay
        // The callback URL will handle enrollment
        resolve(true)
      } else if (data.gateway === "flutterwave" && data.paymentLink) {
        // Redirect to Flutterwave payment page
        window.location.replace(data.paymentLink)
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

