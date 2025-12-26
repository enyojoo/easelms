"use client"

import { useState, useEffect } from "react"
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
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("relevance")
  const [mounted, setMounted] = useState(false)

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading) {
      if (!user || userType !== "user") {
        router.push("/auth/learner/login")
      } else {
        setDashboardUser(user as User)
      }
    }
  }, [user, userType, authLoading, router])

  // Fetch courses and enrollments
  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !dashboardUser) return

      try {
        setCoursesLoading(true)
        setCoursesError(null)

        // Fetch all courses
        const coursesResponse = await fetch("/api/courses")
        if (!coursesResponse.ok) {
          const errorData = await coursesResponse.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch courses")
        }
        const coursesData = await coursesResponse.json()
        const fetchedCourses = coursesData.courses || []
        
        // Ensure courses have required fields for CourseCard
        const processedCourses = fetchedCourses.map((course: any) => ({
          ...course,
          lessons: Array.isArray(course.lessons) ? course.lessons : [],
          settings: course.settings || {},
          price: course.price || 0,
          description: course.description || "",
          image: course.image || course.thumbnail || "/placeholder.svg?height=200&width=300",
        }))
        
        setCourses(processedCourses)

        // Fetch enrollments
        const enrollmentsResponse = await fetch("/api/enrollments")
        if (enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json()
          setEnrollments(enrollmentsData.enrollments || [])
        } else {
          // Don't throw - just use empty array
          console.warn("Failed to fetch enrollments:", enrollmentsResponse.status)
          setEnrollments([])
        }
      } catch (error: any) {
        console.error("Error fetching data:", error)
        setCoursesError(error.message || "Failed to load courses")
      } finally {
        setCoursesLoading(false)
      }
    }

    fetchData()
  }, [authLoading, dashboardUser])

  // Show skeleton until mounted and auth is loaded
  if (!mounted || authLoading || !dashboardUser) {
    return <CoursesPageSkeleton />
  }

  // Get enrolled and completed course IDs from enrollments
  const enrolledCourseIds = enrollments.map((e: any) => e.course_id)
  const completedCourseIds = enrollments
    .filter((e: any) => e.status === "completed")
    .map((e: any) => e.course_id)
  
  const enrolledCourses = courses.filter((course) => enrolledCourseIds.includes(course.id))
  const completedCourses = courses.filter((course) => completedCourseIds.includes(course.id))
  const availableCourses = courses.filter(
    (course) => !enrolledCourseIds.includes(course.id) && !completedCourseIds.includes(course.id),
  )

  const filterCourses = (coursesList: Course[]) => {
    let filtered = coursesList.filter((course) => course.title.toLowerCase().includes(searchTerm.toLowerCase()))

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

  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
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
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : coursesError ? (
            <p className="text-muted-foreground text-sm md:text-base text-center py-8 text-destructive">{coursesError}</p>
          ) : filterCourses([
            ...enrolledCourses,
            ...availableCourses,
            ...completedCourses,
          ]).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filterCourses([
                ...enrolledCourses,
                ...availableCourses,
                ...completedCourses,
              ]).map((course) => (
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
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3].map((i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : coursesError ? (
            <p className="text-muted-foreground text-sm md:text-base text-center py-8 text-destructive">{coursesError}</p>
          ) : filterCourses(enrolledCourses).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filterCourses(enrolledCourses).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  status="enrolled"
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
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 md:mt-6">
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3].map((i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : coursesError ? (
            <p className="text-muted-foreground text-sm md:text-base text-center py-8 text-destructive">{coursesError}</p>
          ) : filterCourses(completedCourses).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filterCourses(completedCourses).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  status="completed"
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
