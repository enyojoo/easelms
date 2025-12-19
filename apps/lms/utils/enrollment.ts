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

/**
 * Handle payment/subscription for paid courses
 * This is a stub - should be replaced with actual payment integration
 */
export function handleCoursePayment(
  courseId: number,
  enrollmentMode: "buy" | "recurring",
  price: number,
  recurringPrice?: number
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

