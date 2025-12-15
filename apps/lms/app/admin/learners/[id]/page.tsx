"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Mail,
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  DollarSign,
  User,
} from "lucide-react"
import { users } from "@/data/users"
import { modules } from "@/data/courses"
import type { User } from "@/data/users"
import Link from "next/link"

export default function LearnerDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [learner, setLearner] = useState<User | null>(null)

  useEffect(() => {
    const foundUser = users.find((u) => u.id === params.id && u.userType === "user")
    if (foundUser) {
      setLearner(foundUser)
    }
  }, [params.id])

  if (!learner) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Learner not found</p>
          <Link href="/admin/learners">
            <Button variant="outline" className="mt-4">
              Back to Learners
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const getCourseTitle = (courseId: number) => {
    const course = modules.find((m) => m.id === courseId)
    return course?.title || `Course ${courseId}`
  }

  const enrolledCourses = modules.filter((course) => learner.enrolledCourses.includes(course.id))
  const completedCourses = modules.filter((course) => learner.completedCourses.includes(course.id))

  return (
    <div className="pt-4 md:pt-8">
      <div className="mb-6">
        <Link href="/admin/learners">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Learners
          </Button>
        </Link>
      </div>

      {/* Learner Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={learner.profileImage} alt={learner.name} />
              <AvatarFallback className="text-2xl">{learner.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{learner.name}</h1>
                <Badge variant="secondary">Learner</Badge>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{learner.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>ID: {learner.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Currency: {learner.currency}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BookOpen className="mr-2 h-4 w-4" />
              Enrolled Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{learner.enrolledCourses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Award className="mr-2 h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{learner.completedCourses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{learner.achievements.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Avg Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {learner.enrolledCourses.length > 0
                ? Math.round(
                    (learner.enrolledCourses.reduce((sum, id) => sum + (learner.progress[id] || 0), 0) /
                      learner.enrolledCourses.length) *
                      10
                  ) / 10
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Details */}
      <Tabs defaultValue="enrollments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Courses</CardTitle>
            </CardHeader>
            <CardContent>
              {enrolledCourses.length > 0 ? (
                <div className="space-y-4">
                  {enrolledCourses.map((course) => {
                    const progress = learner.progress[course.id] || 0
                    return (
                      <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{course.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{course.lessons.length} lessons</span>
                            <span>{course.enrolledStudents || 0} learners</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1 text-center">{progress}%</p>
                          </div>
                          <Link href={`/learner/courses/${course.id}`}>
                            <Button variant="outline" size="sm">
                              View Course
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No enrolled courses</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {learner.enrolledCourses.length > 0 ? (
                <div className="space-y-4">
                  {learner.enrolledCourses.map((courseId) => {
                    const course = modules.find((m) => m.id === courseId)
                    const progress = learner.progress[courseId] || 0
                    if (!course) return null
                    return (
                      <div key={courseId} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{course.title}</span>
                          <span className="text-sm text-muted-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No progress data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {learner.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {learner.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 border rounded-lg">
                      <Award className="h-8 w-8 text-yellow-500" />
                      <div>
                        <p className="font-semibold">{achievement}</p>
                        <p className="text-sm text-muted-foreground">Earned achievement</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No achievements yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

