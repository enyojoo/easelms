"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { extractIdFromSlug } from "@/lib/slug"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BookOpen, Clock, Users, PlayCircle, CheckCircle2 } from "lucide-react"
import SafeImage from "@/components/SafeImage"
import EnrollmentCTA from "@/components/EnrollmentCTA"
import { Module } from "@/lib/types/course"
import { formatCurrency } from "@/lib/utils/currency"

// You can use environment variables for the app URL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.example.com").replace(/\/$/, '') // Remove trailing slash

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const slugOrId = params.id as string // Can be either "course-title-123" or just "123"
  const courseId = extractIdFromSlug(slugOrId)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true)
        // Use the original slug/ID from params, let the API route handle extraction
        const response = await fetch(`/api/courses/${slugOrId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError("Course not found")
          } else {
            throw new Error("Failed to fetch course")
          }
          return
        }
        const data = await response.json()
        setCourse(data.course)
      } catch (err: any) {
        setError(err.message || "Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      fetchCourse()
    }
  }, [courseId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-32 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="aspect-video bg-muted rounded-lg"></div>
                <div className="space-y-4">
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-64 bg-muted rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Button onClick={() => router.push("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
  const coursePrice = course.price || course.settings?.enrollment?.price || 0

  const getPriceDisplay = () => {
    if (enrollmentMode === "free") {
      return "Free"
    }
    if (enrollmentMode === "buy" && coursePrice > 0) {
      return formatCurrency(coursePrice, "USD")
    }
    return "Free"
  }

  const getCourseBadge = () => {
    switch (enrollmentMode) {
      case "free":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Free</Badge>
      case "buy":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Paid</Badge>
      case "recurring":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Subscription</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {getCourseBadge()}
                <div className="flex items-center text-muted-foreground">
                  <BookOpen className="w-4 h-4 mr-1" />
                  <span>{Array.isArray(course.lessons) ? course.lessons.length : 0} lessons</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{course.totalHours || 0} hours</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{course.enrolledStudents || 0} students enrolled</span>
                </div>
              </div>
            </div>

            {/* Course Image/Video Preview */}
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video relative rounded-lg overflow-hidden">
                  <SafeImage
                    src={course.image || "/placeholder.svg"}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                  {course.previewVideo && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <PlayCircle className="w-16 h-16 text-white cursor-pointer hover:scale-110 transition-transform" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Course Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Course</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{course.description}</p>
              </CardContent>
            </Card>

            {/* What You'll Learn */}
            <Card>
              <CardHeader>
                <CardTitle>What You'll Learn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.lessons?.slice(0, 6).map((lesson, index) => (
                    <div key={lesson.id || index} className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{lesson.title}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Who This Course Is For */}
            {course.whoIsThisFor && (
              <Card>
                <CardHeader>
                  <CardTitle>Who This Course Is For</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{course.whoIsThisFor}</p>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {course.requirements && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{course.requirements}</p>
                </CardContent>
              </Card>
            )}

            {/* Prerequisites */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Prerequisites</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Complete these courses before enrolling:
                  </p>
                  <div className="space-y-3">
                    {course.prerequisites.map((prereq) => (
                      <div key={prereq.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <SafeImage
                            src={prereq.image || "/placeholder.svg"}
                            alt={prereq.title}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{prereq.title}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructor Information */}
            {course.instructors && course.instructors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Instructor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {course.instructors.map((instructor, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          <SafeImage
                            src={instructor.profileImage || "/placeholder.svg"}
                            alt={instructor.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{instructor.name}</h3>
                          <p className="text-primary font-medium mb-2">{instructor.title}</p>
                          {instructor.bio && (
                            <p className="text-muted-foreground">{instructor.bio}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <EnrollmentCTA course={course} variant="sidebar" />

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}