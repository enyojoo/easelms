"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Award, BookOpen, ChevronRight, Clock } from "lucide-react"
import { useClientAuthState } from "@/utils/client-auth"
import { createCourseSlug } from "@/lib/slug"
import type { User } from "@/data/users"
import { useEnrollments, useProgress, useCourses, useRealtimeEnrollments, useRealtimeProgress, useProfile } from "@/lib/react-query/hooks"

interface Course {
  id: number
  title: string
  image?: string
  progress?: number
  lessons?: Array<{ id: number; title: string; type?: string; settings?: any; }>
  nextLessonIndex?: number
}


export default function LearnerDashboard() {
  const { user, loading: authLoading } = useClientAuthState()
  
  // Use React Query hooks for base data fetching - use same cached data as courses page
  const { data: coursesData } = useCourses() // Get all courses (cached, same as courses page)
  const { data: enrollmentsData, isPending: enrollmentsPending } = useEnrollments()
  const { data: progressData, isPending: progressPending } = useProgress(null) // Fetch all progress
  const { data: recommendedData, isPending: recommendedPending } = useCourses({ recommended: true })
  const { data: profileData } = useProfile() // Get cached profile data
  
  // Set up real-time subscriptions
  useRealtimeEnrollments(user?.id)
  useRealtimeProgress(undefined, user?.id)

  // Use profile data from React Query cache (instant, no fetching)
  const dashboardUser = profileData?.profile || (user ? { name: user.name, email: user.email, profileImage: user.profileImage } : null)

  // Process recommended courses
  const recommendedCourses = useMemo(() => {
    if (!recommendedData?.courses) return []
    return recommendedData.courses.slice(0, 4).map((course: any) => ({
            id: course.id,
            title: course.title,
            image: course.image || "/placeholder.svg",
          }))
  }, [recommendedData])

  // Get enrolled course IDs
  const enrolledCourseIds = useMemo(() => {
    if (!enrollmentsData?.enrollments) return []
    return enrollmentsData.enrollments.map((e: any) => e.course_id).filter(Boolean)
  }, [enrollmentsData])

  // Filter enrolled courses from cached courses data (instant, no fetch needed)
  const enrolledCoursesData = useMemo(() => {
    if (!coursesData?.courses || !enrolledCourseIds.length) return []
    return coursesData.courses.filter((course: any) => enrolledCourseIds.includes(course.id))
  }, [coursesData, enrolledCourseIds])

  // Calculate enrolled courses with progress using useMemo (no delay, instant calculation)
  const enrolledCourses = useMemo(() => {
    if (!enrollmentsData?.enrollments || !progressData?.progress || enrolledCoursesData.length === 0) {
      return []
    }

    const progressList = progressData.progress
    const enrolledCoursesWithProgress: Course[] = []

    for (const course of enrolledCoursesData) {
      if (!course || !Array.isArray(course.lessons)) continue

      const courseId = course.id
      const courseIdNum = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId

      // Calculate progress - match learn page logic: count unique completed lessons
      // Filter progress by course_id and completed === true, then find unique lesson IDs
      const completedLessonIds = new Set<number>()
      
      progressList.forEach((p: any) => {
        const pCourseId = typeof p.course_id === 'string' ? parseInt(p.course_id, 10) : p.course_id
        if (pCourseId === courseIdNum && p.completed === true && p.lesson_id) {
          const lessonId = typeof p.lesson_id === 'string' ? parseInt(p.lesson_id, 10) : p.lesson_id
          completedLessonIds.add(lessonId)
        }
      })

      const completedLessonCount = completedLessonIds.size
      const totalLessons = course.lessons.length

      const calculatedProgress = totalLessons > 0
        ? Math.round((completedLessonCount / totalLessons) * 100)
        : 0

      // Determine the next lesson to continue learning
      let nextLessonIndex = 0
      for (let i = 0; i < totalLessons; i++) {
        const lesson = course.lessons[i]
        const lessonId = typeof lesson.id === 'string' ? parseInt(lesson.id, 10) : lesson.id
        const isLessonCompleted = completedLessonIds.has(lessonId)
        if (!isLessonCompleted) {
          nextLessonIndex = i
          break
        } else if (i === totalLessons - 1) {
          nextLessonIndex = totalLessons - 1
        }
      }

      enrolledCoursesWithProgress.push({
        id: course.id,
        title: course.title,
        image: course.image || "/placeholder.svg",
        progress: calculatedProgress,
        lessons: course.lessons,
        nextLessonIndex: nextLessonIndex,
      })
    }

    return enrolledCoursesWithProgress
  }, [enrollmentsData, progressData, enrolledCoursesData])


  // Get completed courses count
  const completedCoursesCount = enrolledCourses.filter((course) => {
    // Check if course is completed based on progress or enrollment status
    return (course.progress ?? 0) === 100
  }).length

  // Get courses in progress (enrolled but not completed)
  const coursesInProgress = enrolledCourses.filter((course) => (course.progress ?? 0) < 100)

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  const hasAnyData = enrollmentsData || progressData || recommendedData || enrolledCourses.length > 0
  const showSkeleton = (authLoading || !dashboardUser) && !hasAnyData

  // Only calculate firstName when user data is available to prevent flicker
  const firstName = dashboardUser?.name?.split(" ")[0] || dashboardUser?.name || "there"

  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 max-w-7xl mx-auto px-4 lg:px-6">
      {showSkeleton ? (
        <div className="space-y-4 md:space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="h-32 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="h-64 bg-muted animate-pulse rounded" />
            <div className="h-64 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ) : (
        <>
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            {dashboardUser?.name ? `Hi, ${firstName} 👋🏻` : <span className="h-8 w-48 bg-muted animate-pulse rounded inline-block" />}
          </h1>
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
              {coursesInProgress.length > 0 ? (
                <div className="space-y-4 md:space-y-6">
                  {coursesInProgress.map((course) => (
                    <div key={course.id} className="space-y-2">
                      <h3 className="font-semibold text-sm md:text-base break-words line-clamp-2">{course.title}</h3>
                      <div className="flex items-center gap-2 md:gap-4">
                        <Progress value={typeof course.progress === 'number' ? course.progress : 0} className="flex-grow min-w-0" />
                        <span className="text-sm font-medium flex-shrink-0">{typeof course.progress === 'number' ? course.progress : 0}%</span>
                      </div>
                      <Link href={`/learner/courses/${createCourseSlug(course.title, course.id)}/learn?lessonIndex=${course.nextLessonIndex || 0}`}>
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
              {recommendedCourses.length > 0 ? (
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
