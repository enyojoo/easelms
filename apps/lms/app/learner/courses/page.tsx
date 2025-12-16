"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpDown, Loader2 } from "lucide-react"
import { getClientAuthState } from "@/utils/client-auth"
import { modules } from "@/data/courses"
import type { User } from "@/data/users"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import CourseCard from "@/components/CourseCard"

export default function CoursesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("relevance")

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/learner/login")
    } else {
      setUser(user)
    }
  }, [router])

  if (!user) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const enrolledCourseIds = user.enrolledCourses || []
  const completedCourseIds = user.completedCourses || []
  
  const enrolledCourses = modules.filter((course) => enrolledCourseIds.includes(course.id))
  const completedCourses = modules.filter((course) => completedCourseIds.includes(course.id) || course.id === 4)
  const availableCourses = modules.filter(
    (course) => !enrolledCourseIds.includes(course.id) && !completedCourseIds.includes(course.id),
  )

  const filterCourses = (courses: typeof modules) => {
    let filtered = courses.filter((course) => course.title.toLowerCase().includes(searchTerm.toLowerCase()))

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

  return (
    <div className=" pt-4 md:pt-8">
      <div className="flex items-center mb-4">
        <h1 className="text-3xl font-bold text-primary">Courses</h1>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
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

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Courses</TabsTrigger>
          <TabsTrigger value="enrolled">Enrolled</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterCourses([
              ...enrolledCourses,
              ...availableCourses,
              ...completedCourses.filter((course) => course.id !== 4),
            ]).map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                enrolledCourseIds={enrolledCourseIds}
                completedCourseIds={completedCourseIds}
                userProgress={user.progress || {}}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="enrolled">
          {filterCourses(enrolledCourses).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCourses(enrolledCourses).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  status="enrolled"
                  enrolledCourseIds={enrolledCourseIds}
                  completedCourseIds={completedCourseIds}
                  userProgress={user.progress || {}}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No enrolled courses found.</p>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {filterCourses(completedCourses).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCourses(completedCourses).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  status="completed"
                  enrolledCourseIds={enrolledCourseIds}
                  completedCourseIds={completedCourseIds}
                  userProgress={user.progress || {}}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No completed courses found.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
