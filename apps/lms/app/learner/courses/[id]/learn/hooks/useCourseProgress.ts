import { useMemo } from "react"

interface UseCourseProgressProps {
  course?: {
    lessons?: Array<{ id: number }>
  }
  progressData?: {
    progress?: Array<{
      lesson_id: number
      completed: boolean
    }>
  }
}

/**
 * Custom hook to calculate course progress
 * Extracted from learn/page.tsx to simplify the main component
 */
export function useCourseProgress({ course, progressData }: UseCourseProgressProps) {
  return useMemo(() => {
    // Ensure course exists and has lessons array
    if (!course || !Array.isArray(course.lessons) || course.lessons.length === 0) {
      return { completedLessons: [], progress: 0, allCompleted: false }
    }

    // Ensure progressData exists and has progress array
    if (!progressData?.progress || !Array.isArray(progressData.progress)) {
      return { completedLessons: [], progress: 0, allCompleted: false }
    }

    const progressList = progressData.progress
    const completed: number[] = []

    progressList.forEach((p: any) => {
      if (p.completed && p.lesson_id != null) {
        const lessonIndex = course.lessons.findIndex((l: any) => l.id === p.lesson_id)
        if (lessonIndex >= 0) {
          completed.push(lessonIndex)
        }
      }
    })

    const progressPercent = (completed.length / course.lessons.length) * 100
    const allCompleted = completed.length === course.lessons.length

    return {
      completedLessons: completed,
      progress: progressPercent,
      allCompleted,
    }
  }, [course, progressData])
}
