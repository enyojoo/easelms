"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Clock, Play, Banknote, Users } from "lucide-react"
import { getClientAuthState } from "@/utils/client-auth"
import { modules } from "@/data/courses"
import type { User } from "@/data/users"

export default function CoursesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/learner/login")
    } else {
      setUser(user)
    }
  }, [router])

  if (!user) {
    return <div>Loading...</div>
  }

  const enrolledCourses = modules.filter((course) => user.enrolledCourses.includes(course.id))
  const completedCourses = modules.filter((course) => user.completedCourses.includes(course.id) || course.id === 4)
  const availableCourses = modules.filter(
    (course) => !user.enrolledCourses.includes(course.id) && !user.completedCourses.includes(course.id),
  )

  const filterCourses = (courses: typeof modules) =>
    courses.filter((course) => course.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const courseImages: Record<string, string> = {
    "Digital Marketing & Social Media":
      "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1474&q=80",
    "Startup Fundamentals":
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    "Basic Money Management":
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1511&q=80",
    "Public Speaking & Communication":
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    "Building Side Hustles":
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
    "Tech Skills (No-code, AI Basics)":
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  }

  const renderCourseCard = (course: typeof modules[0], status: "enrolled" | "completed" | "available") => {
    const isEnrolled = user.enrolledCourses.includes(course.id)
    const isCompleted = user.completedCourses.includes(course.id) || course.id === 4

    const getCTAButton = () => {
      const viewCourseButton = (
        <Button variant="outline" asChild className="flex-1">
          <Link href={`/courses/${course.id}`}>View Course</Link>
        </Button>
      )

      if (isCompleted) {
        return (
          <>
            {viewCourseButton}
            <Button variant="outline" asChild className="flex-1">
              <Link href={`/courses/${course.id}/learn/summary`}>View Summary</Link>
            </Button>
          </>
        )
      } else if (isEnrolled) {
        return (
          <>
            {viewCourseButton}
            <Button asChild className="flex-1">
              <Link href={`/courses/${course.id}`}>
                <Play className="w-4 h-4 mr-2" />
                Continue
              </Link>
            </Button>
          </>
        )
      } else {
        // Simulating different course access types
        const accessType = ["free", "buy", "subscribe", "request"][course.id % 4]
        switch (accessType) {
          case "free":
            return (
              <>
                {viewCourseButton}
                <Button asChild className="flex-1">
                  <Link href={`/courses/${course.id}`}>Start Free Course</Link>
                </Button>
              </>
            )
          case "buy":
            return (
              <>
                {viewCourseButton}
                <Button asChild className="flex-1">
                  <Link href={`/courses/${course.id}`}>Buy for $49</Link>
                </Button>
              </>
            )
          case "subscribe":
            return (
              <>
                {viewCourseButton}
                <Button asChild className="flex-1">
                  <Link href={`/courses/${course.id}`}>Subscribe for $20/mo</Link>
                </Button>
              </>
            )
          case "request":
            return (
              <>
                {viewCourseButton}
                <Button asChild className="flex-1">
                  <Link href={`/courses/${course.id}`}>Request Access</Link>
                </Button>
              </>
            )
        }
      }
    }

    return (
      <Card key={course.id} className="flex flex-col h-full">
        <CardHeader className="p-6">
          <div className="aspect-video relative rounded-md overflow-hidden mb-4">
            <Image
              src={courseImages[course.title] || "/placeholder.svg?height=200&width=300"}
              alt={course.title}
              layout="fill"
              objectFit="cover"
            />
          </div>
          <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
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
              <Users className="w-4 h-4 mr-1" />
              <span>{course.enrolledStudents || 0} learners</span>
            </div>
            <div className="flex items-center">
              <Banknote className="w-4 h-4 mr-1" />
              <span>{course.price ? `$${course.price}` : "Free"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow px-6 pb-6">
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{course.description}</p>
          {status === "enrolled" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{user.progress[course.id]}%</span>
              </div>
              <Progress value={user.progress[course.id]} className="w-full" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2 p-6 pt-0">{getCTAButton()}</CardFooter>
      </Card>
    )
  }

  return (
    <div className=" pt-4 md:pt-8">
      <div className="flex items-center mb-4">
        <h1 className="text-3xl font-bold text-primary">Courses</h1>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
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
            ]).map((course) => {
              if (user.completedCourses.includes(course.id) || course.id === 4) {
                return renderCourseCard(course, "completed")
              } else if (user.enrolledCourses.includes(course.id)) {
                return renderCourseCard(course, "enrolled")
              } else {
                return renderCourseCard(course, "available")
              }
            })}
          </div>
        </TabsContent>

        <TabsContent value="enrolled">
          {filterCourses(enrolledCourses).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCourses(enrolledCourses).map((course) => renderCourseCard(course, "enrolled"))}
            </div>
          ) : (
            <p className="text-muted-foreground">No enrolled courses found.</p>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {filterCourses(completedCourses).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterCourses(completedCourses).map((course) => renderCourseCard(course, "completed"))}
            </div>
          ) : (
            <p className="text-muted-foreground">No completed courses found.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
