"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Award, BookOpen, ChevronRight, Clock, Loader2 } from "lucide-react"
import { useClientAuthState } from "@/utils/client-auth"
import { modules } from "@/data/courses"
import type { User } from "@/data/users"


export default function LearnerDashboard() {
  const { user, loading } = useClientAuthState()
  const [dashboardUser, setDashboardUser] = useState<User | null>(null)

  useEffect(() => {
    if (!loading && user) {
      setDashboardUser(user as User)
    }
  }, [user, loading])

  // Listen for profile updates - the hook will update automatically
  // No need for separate listener, just react to user changes

  if (loading || !dashboardUser) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Get enrolled courses from user data and match with modules
  const enrolledCourses = (dashboardUser.enrolledCourses || [])
    .map((courseId) => {
      const course = modules.find((m) => m.id === courseId)
      if (!course) return null
      return {
        id: course.id,
        title: course.title,
        progress: dashboardUser.progress?.[courseId] || 0,
      }
    })
    .filter((course): course is { id: number; title: string; progress: number } => course !== null)

  // Get completed courses count
  const completedCoursesCount = (dashboardUser.completedCourses || []).length

  // Get courses in progress (enrolled but not completed)
  const coursesInProgress = enrolledCourses.filter(
    (course) => !(dashboardUser.completedCourses || []).includes(course.id)
  )

  // Get recommended courses with random selection that changes every 12 hours
  const getRecommendedCourses = () => {
    const enrolledCourseIds = new Set(user.enrolledCourses || [])
    const availableCourses = modules.filter((course) => !enrolledCourseIds.has(course.id))

    if (availableCourses.length === 0) return []

    // Generate a seed based on the current 12-hour period
    // This ensures the same courses are shown for 12 hours, then change
    const now = new Date()
    const hoursSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60))
    const twelveHourPeriod = Math.floor(hoursSinceEpoch / 12)
    
    // Seeded random number generator (Linear Congruential Generator)
    let seed = twelveHourPeriod
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    // Create array with indices and shuffle using seeded random
    const indices = availableCourses.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }

    // Take first 4 courses based on shuffled indices
    return indices.slice(0, 4).map((idx) => {
      const course = availableCourses[idx]
      return {
        id: course.id,
        title: course.title,
        image: course.image,
      }
    })
  }

  const recommendedCourses = getRecommendedCourses()

  const firstName = user.name?.split(" ")[0] || user.name || "there"

  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 max-w-7xl mx-auto px-4 lg:px-6">
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
              {coursesInProgress.length > 0 ? (
                <div className="space-y-4 md:space-y-6">
                  {coursesInProgress.map((course) => (
                    <div key={course.id} className="space-y-2">
                      <h3 className="font-semibold text-sm md:text-base break-words line-clamp-2">{course.title}</h3>
                      <div className="flex items-center gap-2 md:gap-4">
                        <Progress value={course.progress} className="flex-grow min-w-0" />
                        <span className="text-sm font-medium flex-shrink-0">{course.progress}%</span>
                      </div>
                      <Link href={`/learner/courses/${course.id}/learn`}>
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
                      href={`/learner/courses/${course.id}`} 
                      className={`flex min-w-0 ${index >= 2 ? 'hidden sm:flex' : ''}`}
                    >
                      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col w-full min-w-0">
                        <div className="relative w-full h-32 sm:h-24 md:h-32">
                          <Image
                            src={course.image}
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
    </div>
  )
}
