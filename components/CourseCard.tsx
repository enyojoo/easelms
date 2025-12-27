"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Clock, Users, Banknote, Play, Award, CheckCircle2 } from "lucide-react"
import CurrencyConverter from "./CurrencyConverter"

interface CourseCardProps {
  course: {
    id: number
    title: string
    description: string
    image?: string
    price?: number
    lessons: any[]
    enrolledStudents?: number
    settings?: {
      enrollment?: {
        enrollmentMode: "free" | "buy" | "recurring"
        price?: number
      }
    }
  }
  status?: "enrolled" | "completed" | "available"
  progress?: number
  showProgress?: boolean
  className?: string
}

export default function CourseCard({
  course,
  status = "available",
  progress = 0,
  showProgress = false,
  className,
}: CourseCardProps) {
  const courseImages: Record<string, string> = {
    "Digital Marketing & Social Media":
      "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1474&q=80",
    "Startup Fundamentals":
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    "Basic Money Management":
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1511&q=80",
    "Public Speaking & Communication":
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  }

  const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
  const priceUSD = course.settings?.enrollment?.price || course.price || 0

  const getActionButton = () => {
    if (status === "completed") {
      return (
        <Button variant="outline" asChild className="w-full">
          <Link href={`/learner/courses/${course.id}/learn/summary`}>
            <Award className="mr-2 h-4 w-4" />
            View Certificate
          </Link>
        </Button>
      )
    }

    if (status === "enrolled") {
      return (
        <Button asChild className="w-full">
          <Link href={`/learner/courses/${course.id}/learn`}>
            <Play className="mr-2 h-4 w-4" />
            Continue Learning
          </Link>
        </Button>
      )
    }

    // Available courses
    switch (enrollmentMode) {
      case "free":
        return (
          <Button asChild className="w-full">
            <Link href={`/learner/courses/${course.id}`}>
              Start Free Course
            </Link>
          </Button>
        )
      case "buy":
        return (
          <Button asChild className="w-full">
            <Link href={`/learner/courses/${course.id}`}>
              <Banknote className="mr-2 h-4 w-4" />
              Enroll Now
            </Link>
          </Button>
        )
      case "recurring":
        return (
          <Button asChild className="w-full">
            <Link href={`/learner/courses/${course.id}`}>
              Subscribe
            </Link>
          </Button>
        )
      default:
        return (
          <Button asChild className="w-full">
            <Link href={`/learner/courses/${course.id}`}>
              View Course
            </Link>
          </Button>
        )
    }
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="p-0">
        <div className="aspect-video relative rounded-t-lg overflow-hidden">
          <Image
            src={courseImages[course.title] || course.image || "/placeholder.svg"}
            alt={course.title}
            fill
            className="object-cover"
          />
          {status === "completed" && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Completed
              </Badge>
            </div>
          )}
          {status === "enrolled" && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary">In Progress</Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-6">
        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{course.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{course.description}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 mr-1" />
            <span>{course.lessons.length} lessons</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>{(course as any).totalHours || 0} hours</span>
          </div>
          {course.enrolledStudents !== undefined && (
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{course.enrolledStudents} learners</span>
            </div>
          )}
        </div>

        {showProgress && status === "enrolled" && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {enrollmentMode !== "free" && priceUSD > 0 && (
          <div className="mb-4">
            <CurrencyConverter amountUSD={priceUSD} showRate={false} />
          </div>
        )}
        {enrollmentMode === "free" && (
          <div className="mb-4">
            <span className="text-2xl font-bold text-green-600">Free</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-6 pt-0">
        {getActionButton()}
      </CardFooter>
    </Card>
  )
}

