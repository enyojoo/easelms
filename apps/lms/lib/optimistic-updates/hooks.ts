/**
 * Optimistic Update Hooks
 * Provides immediate UI feedback for user actions with rollback on failure
 */

import { useEnhancedMutation } from "@/lib/cache/react-query-integration"
import { toast } from "sonner"

// Optimistic course enrollment
export function useOptimisticEnrollCourse() {
  return useEnhancedMutation(
    async ({ courseId, bypassPrerequisites = false }: { courseId: number; bypassPrerequisites?: boolean }) => {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, bypassPrerequisites }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error: any = new Error(errorData.error || "Failed to enroll in course")
        error.response = response
        error.errorData = errorData
        throw error
      }
      return response.json()
    },
    {
      mutationKey: ["enrollments"],
      optimistic: true,
      rollbackOnError: true,
      onMutate: async ({ courseId }) => {
        // Show immediate success feedback
        toast.loading("Enrolling in course...", { id: `enroll-${courseId}` })

        // The optimistic update logic is handled by the RealtimeManager
        // which will update the enrollments cache when the enrollment is confirmed
      },
      onSuccess: (data, { courseId }) => {
        toast.success("Successfully enrolled in course!", { id: `enroll-${courseId}` })
      },
      onError: (error, { courseId }) => {
        toast.error("Failed to enroll in course. Please try again.", { id: `enroll-${courseId}` })
      }
    }
  )
}

// Optimistic course unenrollment
export function useOptimisticUnenrollCourse() {
  return useEnhancedMutation(
    async ({ courseId }: { courseId: number }) => {
      const response = await fetch(`/api/enrollments?courseId=${courseId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to unenroll from course")
      }
      return response.json()
    },
    {
      mutationKey: ["enrollments"],
      optimistic: true,
      rollbackOnError: true,
      onMutate: async ({ courseId }) => {
        toast.loading("Unenrolling from course...", { id: `unenroll-${courseId}` })
      },
      onSuccess: (data, { courseId }) => {
        toast.success("Successfully unenrolled from course!", { id: `unenroll-${courseId}` })
      },
      onError: (error, { courseId }) => {
        toast.error("Failed to unenroll from course. Please try again.", { id: `unenroll-${courseId}` })
      }
    }
  )
}

// Optimistic profile update
export function useOptimisticUpdateProfile() {
  return useEnhancedMutation(
    async (profileData: any) => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update profile")
      }
      return response.json()
    },
    {
      mutationKey: ["profile"],
      optimistic: true,
      rollbackOnError: true,
      onMutate: async (profileData) => {
        toast.loading("Updating profile...", { id: "profile-update" })
      },
      onSuccess: (data) => {
        toast.success("Profile updated successfully!", { id: "profile-update" })
      },
      onError: (error) => {
        toast.error("Failed to update profile. Please try again.", { id: "profile-update" })
      }
    }
  )
}

// Optimistic lesson progress update
export function useOptimisticUpdateProgress() {
  return useEnhancedMutation(
    async ({ courseId, lessonId, progress }: { courseId: number; lessonId: number; progress: number }) => {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId, progress }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update progress")
      }
      return response.json()
    },
    {
      mutationKey: ["progress"],
      optimistic: true,
      rollbackOnError: false, // Don't rollback progress updates - better UX
      onSuccess: (data, { courseId, lessonId, progress }) => {
        // Only show success for major milestones (100% completion)
        if (progress === 100) {
          toast.success("Lesson completed! 🎉", { duration: 2000 })
        }
      },
      onError: (error, { courseId, lessonId, progress }) => {
        // Only show error for major milestones
        if (progress === 100) {
          toast.error("Failed to save lesson completion. Progress may not be updated.", { duration: 3000 })
        }
      }
    }
  )
}

// Optimistic quiz submission
export function useOptimisticSubmitQuiz() {
  return useEnhancedMutation(
    async ({ courseId, lessonId, answers }: { courseId: number; lessonId: number; answers: any }) => {
      const response = await fetch("/api/quiz-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId, answers }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to submit quiz")
      }
      return response.json()
    },
    {
      mutationKey: ["quiz-results"],
      optimistic: true,
      rollbackOnError: true,
      onMutate: async ({ courseId, lessonId }) => {
        toast.loading("Submitting quiz...", { id: `quiz-${courseId}-${lessonId}` })
      },
      onSuccess: (data, { courseId, lessonId }) => {
        toast.success("Quiz submitted successfully!", { id: `quiz-${courseId}-${lessonId}` })
      },
      onError: (error, { courseId, lessonId }) => {
        toast.error("Failed to submit quiz. Please try again.", { id: `quiz-${courseId}-${lessonId}` })
      }
    }
  )
}

// Optimistic bookmark toggle
export function useOptimisticToggleBookmark() {
  return useEnhancedMutation(
    async ({ courseId, bookmarked }: { courseId: number; bookmarked: boolean }) => {
      const response = await fetch("/api/bookmarks", {
        method: bookmarked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update bookmark")
      }
      return response.json()
    },
    {
      mutationKey: ["bookmarks"],
      optimistic: true,
      rollbackOnError: true,
      onSuccess: (data, { bookmarked }) => {
        toast.success(bookmarked ? "Course bookmarked!" : "Bookmark removed!", { duration: 2000 })
      },
      onError: (error, { bookmarked }) => {
        toast.error("Failed to update bookmark. Please try again.", { duration: 3000 })
      }
    }
  )
}