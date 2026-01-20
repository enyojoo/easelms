"use client"

import SafeImage from "@/components/SafeImage"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, Banknote, Users } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import type { Module } from "@/lib/types/course"

interface CourseCardProps {
  course: Module
  className?: string
}

export default function CourseCard({
  course,
  className,
}: CourseCardProps) {
  const imageSrc = course.image || "/placeholder.svg"

  // Get enrollment mode and price
  const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
  const coursePrice = course.price || course.settings?.enrollment?.price || 0

  // Get course type badge
  const getCourseTypeBadge = () => {
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

  // Format price display
  const getPriceDisplay = () => {
    if (enrollmentMode === "free") {
      return "Free"
    }

    if (enrollmentMode === "buy" && coursePrice > 0) {
      return formatCurrency(coursePrice, "USD") // Default to USD for now
    }

    return "Free"
  }

  return (
    <Card className={`flex flex-col h-full hover:shadow-lg transition-shadow ${className || ""}`}>
      <CardHeader className="p-6">
        <Link href={`/courses/${course.id}`} className="block">
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
        <Link href={`/courses/${course.id}`} className="block">
          <CardTitle className="text-lg mb-2 hover:text-primary transition-colors cursor-pointer line-clamp-2">
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
            <span>{course.totalHours || 0} hours</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            <span>{course.enrolledStudents || 0} students</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow px-6 pb-6">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{course.description}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <EnrollmentCTA course={course} variant="inline" className="w-full" />
      </CardFooter>
    </Card>
  )
}