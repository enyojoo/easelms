"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, Banknote, Eye, Play } from "lucide-react"
import type { Module } from "@/data/courses"

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
  const isEnrolled = enrolledCourseIds.includes(course.id)
  const isCompleted = completedCourseIds.includes(course.id)
  const actualStatus = status || (isCompleted ? "completed" : isEnrolled ? "enrolled" : "available")
  const courseProgress = progress !== undefined ? progress : (userProgress[course.id] || 0)

  const getCTAButtons = () => {
    const previewButton = (
      <Button variant="outline" asChild className="flex-1">
        <Link href={`/learner/courses/${course.id}`}>
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
            <Link href={`/learner/courses/${course.id}/learn/summary`}>View Summary</Link>
          </Button>
        </>
      )
    } else if (actualStatus === "enrolled") {
      return (
        <>
          {previewButton}
          <Button asChild className="flex-1">
            <Link href={`/learner/courses/${course.id}/learn`}>
              <Play className="w-4 h-4 mr-2" />
              Continue
            </Link>
          </Button>
        </>
      )
    } else {
      // Available courses - determine access type from enrollment mode
      const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
      const coursePrice = course.settings?.enrollment?.price || course.price || 0
      const recurringPrice = course.settings?.enrollment?.recurringPrice

      switch (enrollmentMode) {
        case "free":
          return (
            <>
              {previewButton}
              <Button asChild className="flex-1">
                <Link href={`/learner/courses/${course.id}`}>Start Free Course</Link>
              </Button>
            </>
          )
        case "buy":
          return (
            <>
              {previewButton}
              <Button asChild className="flex-1">
                <Link href={`/learner/courses/${course.id}`}>
                  Buy for ${coursePrice}
                </Link>
              </Button>
            </>
          )
        case "recurring":
          return (
            <>
              {previewButton}
              <Button asChild className="flex-1">
                <Link href={`/learner/courses/${course.id}`}>
                  Subscribe for ${recurringPrice || coursePrice}/mo
                </Link>
              </Button>
            </>
          )
        default:
          return (
            <>
              {previewButton}
              <Button asChild className="flex-1">
                <Link href={`/learner/courses/${course.id}`}>Request Access</Link>
              </Button>
            </>
          )
      }
    }
  }

  const imageSrc = courseImage || course.image || "/placeholder.svg?height=200&width=300"

  // Determine the main link URL based on course status
  const getMainLink = () => {
    if (actualStatus === "enrolled") {
      return `/learner/courses/${course.id}/learn`
    } else if (actualStatus === "completed") {
      return `/learner/courses/${course.id}/learn/summary`
    } else {
      return `/learner/courses/${course.id}`
    }
  }

  const mainLink = getMainLink()

  // Get course type badge
  const getCourseTypeBadge = () => {
    if (actualStatus === "enrolled" || actualStatus === "completed") {
      return null // Don't show badge for enrolled/completed courses
    }

    const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
    
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
      case "recurring":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Subscription
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card className={`flex flex-col h-full ${className || ""}`}>
      <CardHeader className="p-6">
        <Link href={mainLink} className="block">
          <div className="aspect-video relative rounded-md overflow-hidden mb-4 cursor-pointer hover:opacity-90 transition-opacity">
            <Image
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
        <Link href={mainLink} className="block">
          <CardTitle className="text-lg mb-2 hover:text-primary transition-colors cursor-pointer">
            {course.title}
          </CardTitle>
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 mr-1" />
            <span>{course.lessons.length} lessons</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>4 hours</span>
          </div>
          <div className="flex items-center">
            <Banknote className="w-4 h-4 mr-1" />
            <span>
              {(() => {
                const enrollmentMode = course.settings?.enrollment?.enrollmentMode
                const price = course.settings?.enrollment?.price || course.price
                const recurringPrice = course.settings?.enrollment?.recurringPrice
                
                if (enrollmentMode === "recurring" && recurringPrice) {
                  return `$${recurringPrice}/mo`
                } else if (enrollmentMode === "buy" && price) {
                  return `$${price}`
                } else if (enrollmentMode === "free") {
                  return "Free"
                } else if (price) {
                  return `$${price}`
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

