"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Award, BookOpen, ChevronRight, Clock } from "lucide-react"
import { useClientAuthState } from "@/utils/client-auth"
import { createCourseSlug } from "@/lib/slug"
import type { User } from "@/data/users"
import DashboardSkeleton from "@/components/DashboardSkeleton"

interface Course {
  id: number
  title: string
  image?: string
  progress?: number
}


export default function LearnerDashboard() {
  const { user, loading: authLoading } = useClientAuthState()
  const [dashboardUser, setDashboardUser] = useState<User | null>(null)
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([])
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      setDashboardUser(user as User)
    }
  }, [user, authLoading])

  // Fetch enrolled courses and recommended courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (authLoading || !dashboardUser) return

      try {
        setCoursesLoading(true)
        setCoursesError(null)

        // Fetch enrollments (includes course data)
        const enrollmentsResponse = await fetch("/api/enrollments")
        if (!enrollmentsResponse.ok) {
          const errorData = await enrollmentsResponse.json().catch(() => ({}))
          console.error("Failed to fetch enrollments:", {
            status: enrollmentsResponse.status,
            statusText: enrollmentsResponse.statusText,
            error: errorData,
          })
          // Don't throw - just use empty array so dashboard can still load
          setEnrolledCourses([])
        } else {
          const enrollmentsData = await enrollmentsResponse.json()
          const enrollments = enrollmentsData.enrollments || []

          // Map enrollments to courses with progress
          const enrolledCoursesData = enrollments
            .filter((e: any) => e.courses) // Only include enrollments with course data
            .map((enrollment: any) => ({
              id: enrollment.course_id,
              title: enrollment.courses?.title || "Untitled Course",
              progress: enrollment.progress || 0,
            }))
          setEnrolledCourses(enrolledCoursesData)
        }

        // Fetch recommended courses
        const recommendedResponse = await fetch("/api/courses?recommended=true")
        if (recommendedResponse.ok) {
          const recommendedData = await recommendedResponse.json()
          const recommended = (recommendedData.courses || []).slice(0, 4).map((course: any) => ({
            id: course.id,
            title: course.title,
            image: course.image || "/placeholder.svg",
          }))
          setRecommendedCourses(recommended)
        }
      } catch (error: any) {
        console.error("Error fetching courses:", error)
        setCoursesError(error.message || "Failed to load courses")
      } finally {
        setCoursesLoading(false)
      }
    }

    fetchCourses()
  }, [authLoading, dashboardUser])

  // Always render page structure, show skeleton for content if loading
  const isLoading = !mounted || authLoading || !dashboardUser

  // Get completed courses count
  const completedCoursesCount = enrolledCourses.filter((course) => {
    // Check if course is completed based on progress or enrollment status
    return (course.progress ?? 0) === 100
  }).length

  // Get courses in progress (enrolled but not completed)
  const coursesInProgress = enrolledCourses.filter((course) => (course.progress ?? 0) < 100)

  const firstName = dashboardUser?.name?.split(" ")[0] || dashboardUser?.name || "there"

  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 max-w-7xl mx-auto px-4 lg:px-6">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Hi, {firstName} 👋🏻</h1>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm md:text-base font-medium flex items-center">
                <BookOpen className="mr-2 h-4 w-4 flex-shrink-0" /> Courses in Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <p className="text-3xl font-bold">{coursesInProgress.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm md:text-base font-medium flex items-center">
                <Award className="mr-2 h-4 w-4 flex-shrink-0" /> Completed Courses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <p className="text-3xl font-bold">{completedCoursesCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Continue Learning</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {coursesLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
                      <div className="flex items-center gap-4">
                        <div className="h-2 flex-grow bg-muted animate-pulse rounded" />
                        <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : coursesError ? (
                <p className="text-muted-foreground text-sm md:text-base text-destructive">{coursesError}</p>
              ) : coursesInProgress.length > 0 ? (
                <div className="space-y-4 md:space-y-6">
                  {coursesInProgress.map((course) => (
                    <div key={course.id} className="space-y-2">
                      <h3 className="font-semibold text-sm md:text-base break-words line-clamp-2">{course.title}</h3>
                      <div className="flex items-center gap-2 md:gap-4">
                        <Progress value={course.progress || 0} className="flex-grow min-w-0" />
                        <span className="text-sm font-medium flex-shrink-0">{course.progress || 0}%</span>
                      </div>
                      <Link href={`/learner/courses/${createCourseSlug(course.title, course.id)}/learn`}>
                        <Button variant="link" className="mt-1 md:mt-2 p-0 h-auto text-sm md:text-base">
                          Continue <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm md:text-base">No courses in progress</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
              <CardTitle className="text-base md:text-lg">Recommended Courses</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {coursesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 md:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border rounded-lg overflow-hidden">
                      <div className="w-full h-32 sm:h-24 md:h-32 bg-muted animate-pulse" />
                      <div className="p-2 sm:p-3">
                        <div className="h-4 w-full bg-muted animate-pulse rounded mb-2" />
                        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : coursesError ? (
                <p className="text-muted-foreground text-sm md:text-base text-destructive">{coursesError}</p>
              ) : recommendedCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 md:gap-4">
                  {recommendedCourses.map((course, index) => (
                    <Link 
                      key={course.id} 
                      href={`/learner/courses/${createCourseSlug(course.title, course.id)}`} 
                      className={`flex min-w-0 ${index >= 2 ? 'hidden sm:flex' : ''}`}
                    >
                      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col w-full min-w-0">
                        <div className="relative w-full h-32 sm:h-24 md:h-32">
                          <Image
                            src={course.image || "/placeholder.svg"}
                            alt={course.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-2 sm:p-3 flex-grow flex items-center min-h-[3rem]">
                          <h3 className="font-semibold text-xs sm:text-sm md:text-base line-clamp-2 break-words">{course.title}</h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm md:text-base">No recommended courses available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  )
}
