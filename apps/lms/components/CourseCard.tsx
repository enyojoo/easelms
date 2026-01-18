"use client"

import SafeImage from "@/components/SafeImage"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createCourseSlug } from "@/lib/slug"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, Banknote, Eye, Play } from "lucide-react"
import type { Module } from "@/data/courses"
import { isEnrolledInCourse, enrollInCourse, handleCoursePayment } from "@/utils/enrollment"
import { useState, useEffect } from "react"
import { getClientAuthState } from "@/utils/client-auth"
import { toast } from "sonner"
import { useEnrollCourse, useProgress, useCoursePrice, useSettings } from "@/lib/react-query/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { formatCurrency } from "@/lib/utils/currency"

interface CourseCardProps {
  course: Module
  status?: "enrolled" | "completed" | "available"
  progress?: number
  showProgress?: boolean
  userProgress?: Record<number, number>
  enrolledCourseIds?: number[]
  completedCourseIds?: number[]
  courseImage?: string
  className?: string
}

export default function CourseCard({
  course,
  status = "available",
  progress,
  showProgress = false,
  userProgress = {},
  enrolledCourseIds = [],
  completedCourseIds = [],
  courseImage,
  className,
}: CourseCardProps) {
  const router = useRouter()
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [user, setUser] = useState<any>(null)
  const enrollCourseMutation = useEnrollCourse()
  const queryClient = useQueryClient()
  const { data: progressData } = useProgress(course.id)
  const { data: settingsData } = useSettings()
  const coursePrice = course.price || course.settings?.enrollment?.price || 0
  const coursePriceInfo = useCoursePrice(coursePrice)

  useEffect(() => {
    const authState = getClientAuthState()
    setUser(authState.user)
  }, [])
  
  // Check enrollment status using utility function
  const isEnrolled = isEnrolledInCourse(course.id, user) || enrolledCourseIds.includes(course.id)
  const isCompleted = completedCourseIds.includes(course.id)
  // Priority: completed > enrolled > available
  // Only use passed status if it's specifically set to something other than "available"
  const actualStatus = (status && status !== "available") ? status : (isCompleted ? "completed" : isEnrolled ? "enrolled" : "available")
  const courseProgress = progress !== undefined ? progress : (userProgress[course.id] || 0)
  
  const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"

  // Calculate first incomplete lesson index
  const firstIncompleteLessonIndex = useMemo(() => {
    if (!course || !Array.isArray(course.lessons) || !progressData?.progress || actualStatus !== "enrolled") {
      return 0
    }

    const progressList = progressData.progress
    const completedLessonIds = new Set<number>()
    
    // Get all completed lesson IDs
    progressList.forEach((p: any) => {
      if (p.completed && p.lesson_id) {
        const lessonId = typeof p.lesson_id === 'string' ? parseInt(p.lesson_id, 10) : p.lesson_id
        completedLessonIds.add(lessonId)
      }
    })

    // Find first incomplete lesson
    for (let i = 0; i < course.lessons.length; i++) {
      const lesson = course.lessons[i]
      if (!lesson) continue // Skip null/undefined lessons
      const lessonId = typeof lesson.id === 'string' ? parseInt(lesson.id, 10) : lesson.id
      if (!completedLessonIds.has(lessonId)) {
        return i
      }
    }

    // All lessons completed, return last lesson index
    return course.lessons.length > 0 ? course.lessons.length - 1 : 0
  }, [course, progressData, actualStatus])

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsEnrolling(true)
    try {
      if (enrollmentMode === "free") {
        // Enroll directly for free courses using React Query mutation
        try {
          await enrollCourseMutation.mutateAsync(course.id)
          // Invalidate enrollments cache to ensure fresh data
          queryClient.invalidateQueries({ queryKey: ["enrollments"] })
          // Dispatch event to notify parent components
          window.dispatchEvent(new CustomEvent("courseEnrolled", { detail: { courseId: course.id } }))
          // Small delay to ensure cache is updated before redirect
          setTimeout(() => {
            router.push(`/learner/courses/${createCourseSlug(course.title, course.id)}/learn`)
          }, 100)
        } catch (error) {
          console.error("Error enrolling in course:", error)
        }
      } else {
        // For paid courses, handle payment directly
        const coursePrice = course.settings?.enrollment?.price || course.price || 0
        // handleCoursePayment will redirect to payment gateway
        // Success means user is being redirected to payment - don't show error
        // Only show error if the API call actually fails
        try {
          await handleCoursePayment(
            course.id,
            enrollmentMode as "buy",
            coursePrice,
            course.title,
            user
          )
          // If we reach here without error, payment initiation succeeded
          // User will be redirected to payment gateway
          // Don't set isEnrolling to false - let the redirect happen
        } catch (paymentError) {
          // Only show error if payment initiation actually failed
          console.error("Payment initiation failed:", paymentError)
          toast.error("Failed to initiate payment. Please try again.")
          setIsEnrolling(false)
        }
      }
    } catch (error) {
      console.error("Error enrolling in course:", error)
    } finally {
      setIsEnrolling(false)
    }
  }

  const getCTAButtons = () => {
    const previewButton = (
      <Button variant="outline" asChild className="flex-1">
        <Link href={`/learner/courses/${createCourseSlug(course.title, course.id)}`} prefetch={true}>
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Link>
      </Button>
    )

    if (actualStatus === "completed") {
      return (
        <>
          {previewButton}
          <Button variant="outline" asChild className="flex-1">
            <Link href={`/learner/courses/${createCourseSlug(course.title, course.id)}/learn/summary`} prefetch={true}>View Summary</Link>
          </Button>
        </>
      )
    } else if (actualStatus === "enrolled") {
      // When enrolled, always show "Continue" regardless of course type
      // Navigate to first incomplete lesson
      return (
        <>
          {previewButton}
          <Button asChild className="flex-1">
            <Link href={`/learner/courses/${createCourseSlug(course.title, course.id)}/learn?lessonIndex=${firstIncompleteLessonIndex}`} prefetch={true}>
              <Play className="w-4 h-4 mr-2" />
              Continue
            </Link>
          </Button>
        </>
      )
    } else {
      // Available courses - show appropriate CTA based on enrollment mode
      const getButtonText = () => {
        if (isEnrolling) {
          switch (enrollmentMode) {
            case "free":
              return "Enrolling..."
            case "buy":
              return "Processing..."
            default:
              return "Processing..."
          }
        }
        
        switch (enrollmentMode) {
          case "free":
            return "Enroll"
          case "buy":
            return "Buy"
          default:
            return "Enroll"
        }
      }

      return (
        <>
          {previewButton}
          <Button 
            className="flex-1" 
            onClick={handleEnroll}
            disabled={isEnrolling}
          >
            {getButtonText()}
          </Button>
        </>
      )
    }
  }

  const imageSrc = courseImage || course.image || "/placeholder.svg"

  // Determine the main link URL based on course status
  const getMainLink = () => {
    const slug = createCourseSlug(course.title, course.id)
    if (actualStatus === "enrolled") {
      return `/learner/courses/${slug}/learn`
    } else if (actualStatus === "completed") {
      return `/learner/courses/${slug}/learn/summary`
    } else {
      return `/learner/courses/${slug}`
    }
  }

  const mainLink = getMainLink()

  // Get course type badge
  const getCourseTypeBadge = () => {
    if (actualStatus === "completed") {
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          Completed
        </Badge>
      )
    }
    if (actualStatus === "enrolled") {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Enrolled
        </Badge>
      )
    }

    switch (enrollmentMode) {
      case "free":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Free
          </Badge>
        )
      case "buy":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Paid
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card className={`flex flex-col h-full ${className || ""}`}>
      <CardHeader className="p-6">
        <Link href={mainLink} className="block" prefetch={true}>
          <div className="aspect-video relative rounded-md overflow-hidden mb-4 cursor-pointer hover:opacity-90 transition-opacity">
            <SafeImage
              src={imageSrc}
              alt={course.title}
              fill
              className="object-cover"
            />
            {/* Course Type Badge */}
            <div className="absolute top-2 right-2">
              {getCourseTypeBadge()}
            </div>
          </div>
        </Link>
        <Link href={mainLink} className="block" prefetch={true}>
          <CardTitle className="text-lg mb-2 hover:text-primary transition-colors cursor-pointer">
            {course.title}
          </CardTitle>
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 mr-1" />
            <span>{Array.isArray(course.lessons) ? course.lessons.length : 0} lessons</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>{(course as any).totalHours || 0} hours</span>
          </div>
          <div className="flex items-center">
            <Banknote className="w-4 h-4 mr-1" />
            <span>
              {(() => {
                const enrollmentMode = course.settings?.enrollment?.enrollmentMode

                if (!coursePriceInfo) {
                  // Show platform currency price while loading conversion
                  const platformPrice = course.price || course.settings?.enrollment?.price || 0
                  const platformCurrency = settingsData?.platformSettings?.default_currency || "USD"
                  if (platformPrice > 0) {
                    // Show properly formatted currency while loading
                    return formatCurrency(platformPrice, platformCurrency)
                  }
                  return "Free"
                }

                if (enrollmentMode === "buy" && coursePriceInfo.displayPrice > 0) {
                  return coursePriceInfo.formattedDisplayPrice
                } else if (enrollmentMode === "free") {
                  return "Free"
                } else if (coursePriceInfo.displayPrice > 0) {
                  return coursePriceInfo.formattedDisplayPrice
                } else {
                  return "Free"
                }
              })()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow px-6 pb-6">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{course.description}</p>
        {(actualStatus === "enrolled" || showProgress) && courseProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{courseProgress}%</span>
            </div>
            <Progress value={courseProgress} className="w-full" />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 p-6 pt-0">{getCTAButtons()}</CardFooter>
    </Card>
  )
}

