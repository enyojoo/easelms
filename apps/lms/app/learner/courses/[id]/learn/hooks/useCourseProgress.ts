import { useMemo } from "react"

interface UseCourseProgressProps {
  course?: {
    lessons?: Array<{ id: number }>
  }
  progressData?: {
    progress?: Array<{
      lesson_id: number
      completed: boolean
      video_progress?: number | null
    }>
  }
}

/**
 * Custom hook to calculate course progress
 * Extracted from learn/page.tsx to simplify the main component
 */
export function useCourseProgress({ course, progressData }: UseCourseProgressProps) {
  return useMemo(() => {
    if (!course || !progressData?.progress) {
      return { completedLessons: [], progress: 0, videoProgress: {} }
    }

    const progressList = progressData.progress
    const completed: number[] = []
    const videoProg: { [key: number]: number } = {}

    progressList.forEach((p: any) => {
      if (p.completed) {
        const lessonIndex = course.lessons?.findIndex((l: any) => l.id === p.lesson_id) ?? -1
        if (lessonIndex >= 0) {
          completed.push(lessonIndex)
        }
      }
      if (p.video_progress !== undefined && p.video_progress !== null) {
        const lessonIndex = course.lessons?.findIndex((l: any) => l.id === p.lesson_id) ?? -1
        if (lessonIndex >= 0) {
          videoProg[lessonIndex] = p.video_progress
        }
      }
    })

    const progressPercent = course.lessons ? (completed.length / course.lessons.length) * 100 : 0
    const allCompleted = course.lessons ? completed.length === course.lessons.length : false

    return {
      completedLessons: completed,
      progress: progressPercent,
      allCompleted,
      videoProgress: videoProg,
    }
  }, [course, progressData])
}
