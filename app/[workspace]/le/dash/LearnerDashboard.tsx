"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { getClientAuthState } from "@/app/utils/client-auth"
import { modules } from "@/app/data/courses"
import { BookOpen, Calendar } from "lucide-react"

export default function LearnerDashboard({ workspace }: { workspace: string }) {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const { user } = getClientAuthState()
    setUser(user)
  }, [])

  if (!user) return null

  const enrolledCourses = modules.filter((course) => user.enrolledCourses.includes(course.id))
  const upcomingWorkshops = [
    { id: 1, title: "Introduction to Digital Marketing", date: "2023-06-15" },
    { id: 2, title: "Effective Public Speaking", date: "2023-06-20" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome back, {user.name}!</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{enrolledCourses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{user.completedCourses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Workshops</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{upcomingWorkshops.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Your Courses</h2>
        {enrolledCourses.map((course) => (
          <Card key={course.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.lessons.length} lessons</p>
                </div>
                <Button asChild>
                  <Link href={`/${workspace}/courses/${course.id}/learn`}>
                    <BookOpen className="mr-2 h-4 w-4" /> Continue
                  </Link>
                </Button>
              </div>
              <Progress value={user.progress[course.id]} className="mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Upcoming Workshops</h2>
        {upcomingWorkshops.map((workshop) => (
          <Card key={workshop.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{workshop.title}</h3>
                  <p className="text-sm text-muted-foreground">{workshop.date}</p>
                </div>
                <Button asChild>
                  <Link href={`/${workspace}/workshops/${workshop.id}`}>
                    <Calendar className="mr-2 h-4 w-4" /> View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

