import { z } from "zod"

export interface CourseData {
  basicInfo: {
    title: string
    requirements: string
    description: string
    whoIsThisFor: string
    thumbnail: string
    previewVideo: string
    price: string
  }
  lessons: Array<{
    id: string
    title: string
    type: string
    content: any
    resources: any[]
    settings: any
    quiz: any
    estimatedDuration?: number
  }>
  settings: {
    isPublished: boolean
    requiresSequentialProgress: boolean
    minimumQuizScore: number
    enrollment: {
      enrollmentMode: "free" | "buy" | "recurring"
      price?: number
      recurringPrice?: number
    }
    certificate: {
      certificateEnabled: boolean
      certificateTemplate: string
      certificateDescription: string
      signatureImage: string
      signatureTitle: string
      additionalText: string
      certificateType: "completion" | "participation"
    }
    currency: string
  }
}

export const courseValidationSchema = z.object({
  basicInfo: z.object({
    title: z.string().min(1, "Course title is required"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    requirements: z.string().optional(),
    whoIsThisFor: z.string().optional(),
    thumbnail: z.string().optional(),
    previewVideo: z.string().optional(),
    price: z.string().optional(),
  }),
  lessons: z.array(z.any()).optional(),
  settings: z.object({
    isPublished: z.boolean(),
    requiresSequentialProgress: z.boolean(),
    minimumQuizScore: z.number().min(0).max(100),
    enrollment: z.object({
      enrollmentMode: z.enum(["free", "buy", "recurring"]),
      price: z.number().optional(),
      recurringPrice: z.number().optional(),
    }),
    certificate: z.object({
      certificateEnabled: z.boolean(),
      certificateTemplate: z.string().optional(),
      certificateDescription: z.string().optional(),
      signatureImage: z.string().optional(),
      signatureTitle: z.string().optional(),
      additionalText: z.string().optional(),
      certificateType: z.enum(["completion", "participation"]),
    }),
    currency: z.string(),
  }),
})

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
  readyToPublish: boolean
  completionStatus: {
    basicInfo: boolean
    lessons: boolean
    settings: boolean
  }
  progressPercentage: number
}

export function validateCourseData(data: CourseData): ValidationResult {
  const result = courseValidationSchema.safeParse(data)
  const errors: Record<string, string[]> = {}
  
  if (!result.success) {
    result.error.errors.forEach((error) => {
      const path = error.path.join(".")
      if (!errors[path]) {
        errors[path] = []
      }
      errors[path].push(error.message)
    })
  }

  // Check completion status
  const basicInfoComplete = !!(
    data.basicInfo.title &&
    data.basicInfo.description &&
    data.basicInfo.description.length >= 10
  )

  const lessonsComplete = data.lessons && data.lessons.length > 0 && 
    data.lessons.every((lesson) => lesson.title && lesson.title.trim() !== "")

  const settingsComplete = !!(
    data.settings &&
    (data.settings.enrollment.enrollmentMode === "free" ||
      (data.settings.enrollment.enrollmentMode === "buy" && data.settings.enrollment.price) ||
      (data.settings.enrollment.enrollmentMode === "recurring" && data.settings.enrollment.recurringPrice))
  )

  const completionStatus = {
    basicInfo: basicInfoComplete,
    lessons: lessonsComplete,
    settings: settingsComplete,
  }

  const completedSections = Object.values(completionStatus).filter(Boolean).length
  const progressPercentage = Math.round((completedSections / 3) * 100)

  const readyToPublish = result.success && basicInfoComplete && lessonsComplete && settingsComplete

  return {
    isValid: result.success,
    errors,
    readyToPublish,
    completionStatus,
    progressPercentage,
  }
}

