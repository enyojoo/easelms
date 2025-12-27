"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpDown, BookOpen } from "lucide-react"
import { useClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import CourseCard from "@/components/CourseCard"
import CourseCardSkeleton from "@/components/CourseCardSkeleton"
import CoursesPageSkeleton from "@/components/CoursesPageSkeleton"
import { useCourses, useEnrollments, useRealtimeEnrollments, useRealtimeCourses } from "@/lib/react-query/hooks"

interface Course {
  id: number
  title: string
  description?: string
  image?: string
  price?: number
  enrolledStudents?: number
  settings?: any
}

export default function CoursesPage() {
  const router = useRouter()
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [dashboardUser, setDashboardUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("relevance")

  // Use React Query hooks for data fetching
  const { data: coursesData, isPending: coursesPending, error: coursesError } = useCourses()
  const { data: enrollmentsData, isPending: enrollmentsPending } = useEnrollments()
  
  // Set up real-time subscriptions for enrollments and courses
  useRealtimeEnrollments(user?.id)
  useRealtimeCourses() // Listen to course changes and enrollment count updates

  // Process courses data
  const courses = useMemo(() => {
    if (!coursesData?.courses) return []
    return coursesData.courses.map((course: any) => ({
      ...course,
      lessons: Array.isArray(course.lessons) ? course.lessons : [],
      settings: course.settings || {},
      price: course.price || 0,
      description: course.description || "",
      image: course.image || course.thumbnail || "/placeholder.svg",
    }))
  }, [coursesData])

  // Process enrollments data
  const enrollments = useMemo(() => {
    return enrollmentsData?.enrollments || []
  }, [enrollmentsData])

  useEffect(() => {
    if (!authLoading) {
      if (!user || userType !== "user") {
        router.push("/auth/learner/login")
      } else {
        setDashboardUser(user as User)
      }
    }
  }, [user, userType, authLoading, router])

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  const hasAnyData = coursesData || enrollmentsData
  const showSkeleton = (authLoading || !dashboardUser) && !hasAnyData

  // Get enrolled and completed course IDs from enrollments
  const enrolledCourseIds = enrollments.map((e: any) => e.course_id)
  const completedCourseIds = enrollments
    .filter((e: any) => e.status === "completed")
    .map((e: any) => e.course_id)

  const filterCourses = (coursesList: Course[]) => {
    let filtered = coursesList.filter((course) => course.title.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Debug: Log enrolled course IDs and courses
    if (typeof window !== "undefined") {
      console.log("=== FILTER COURSES DEBUG ===")
      console.log("Enrolled course IDs:", enrolledCourseIds)
      console.log("Courses passed in:", coursesList.map(c => ({ id: c.id, title: c.title })))
      console.log("Filtered (search only):", filtered.map(c => ({ id: c.id, title: c.title })))
    }

    // Sorting
    if (sortBy === "price-low") {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0))
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0))
    } else if (sortBy === "enrollments") {
      filtered.sort((a, b) => (b.enrolledStudents || 0) - (a.enrolledStudents || 0))
    } else if (sortBy === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title))
    }

    return filtered
  }

  // Get user progress from enrollments
  const userProgress: Record<number, number> = {}
  enrollments.forEach((enrollment: any) => {
    userProgress[enrollment.course_id] = enrollment.progress || 0
  })

  // Handle error state
  if (coursesError && !coursesPending) {
    return (
      <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">
            {coursesError instanceof Error ? coursesError.message : "Failed to load courses"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
      {showSkeleton ? (
        <CoursesPageSkeleton />
      ) : (
        <>
      <div className="flex items-center mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Courses</h1>
      </div>

      <div className="mb-4 md:mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2 sm:w-auto w-full sm:min-w-[180px]">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4 flex-shrink-0" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="enrollments">Most Enrolled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4 md:space-y-6">
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start sm:justify-center">
          <TabsTrigger value="all" className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4">All Courses</TabsTrigger>
          <TabsTrigger value="enrolled" className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4">Enrolled</TabsTrigger>
          <TabsTrigger value="completed" className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 md:mt-6">
          {coursesPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : coursesError ? (
            <p className="text-muted-foreground text-sm md:text-base text-center py-8 text-destructive">{coursesError}</p>
          ) : filterCourses(courses).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {filterCourses(courses).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrolledCourseIds={enrolledCourseIds}
                  completedCourseIds={completedCourseIds}
                  userProgress={userProgress}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses available</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "No courses match your search. Try adjusting your search terms."
                  : "There are currently no published courses available. Check back later for new courses."}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrolled" className="mt-4 md:mt-6">
          {coursesPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3].map((i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : coursesError ? (
            <p className="text-muted-foreground text-sm md:text-base text-center py-8 text-destructive">{coursesError}</p>
          ) : (() => {
            const enrolledCourses = filterCourses(courses.filter(c => enrolledCourseIds.includes(c.id)))
            return enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {enrolledCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    enrolledCourseIds={enrolledCourseIds}
                    completedCourseIds={completedCourseIds}
                    userProgress={userProgress}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No enrolled courses</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm
                    ? "No enrolled courses match your search. Try adjusting your search terms."
                    : "You haven't enrolled in any courses yet. Browse available courses to get started."}
                </p>
              </div>
            )
          })()}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 md:mt-6">
          {coursesPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3].map((i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : coursesError ? (
            <p className="text-muted-foreground text-sm md:text-base text-center py-8 text-destructive">{coursesError}</p>
          ) : (() => {
            const completedCourses = filterCourses(courses.filter(c => completedCourseIds.includes(c.id)))
            return completedCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {completedCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    enrolledCourseIds={enrolledCourseIds}
                    completedCourseIds={completedCourseIds}
                    userProgress={userProgress}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No completed courses</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm
                    ? "No completed courses match your search. Try adjusting your search terms."
                    : "You haven't completed any courses yet. Continue learning to complete your enrolled courses."}
                </p>
              </div>
            )
          })()}
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  )
}
