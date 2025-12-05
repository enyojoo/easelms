"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Award, BookOpen, Clock, Zap, ChevronRight, BarChart3 } from "lucide-react"
import LearningAnalytics from "./components/LearningAnalytics"
import { getClientAuthState } from "@/app/utils/client-auth"
import type { User } from "@/app/data/users"

// Mock data for the dashboard
const mockEnrolledCourses = [
  { id: 1, title: "Digital Marketing & Social Media", progress: 60 },
  { id: 2, title: "Startup Fundamentals", progress: 30 },
]


const mockRecentAchievements = [
  { id: 1, title: "Course Completion", description: "Completed Digital Marketing Basics", icon: Award },
  { id: 2, title: "Perfect Score", description: "100% on Social Media Quiz", icon: Award },
]

const mockRecommendedCourses = [
  {
    id: 3,
    title: "Basic Money Management",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1511&q=80",
  },
  {
    id: 4,
    title: "Public Speaking & Communication",
    image:
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  },
]

export default function LearnerDashboard() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const { user } = getClientAuthState()
    setUser(user)
  }, [])

  if (!user) {
    return <div className="p-4 md:p-8 pt-20 md:pt-24">Loading...</div>
  }

  const enrolledCourses = mockEnrolledCourses

  return (
    <div className="pt-4 md:pt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Hi, {user.name}!</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2" /> Courses in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{enrolledCourses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2" /> Learning Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2" /> Learning Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Continue Learning</CardTitle>
          </CardHeader>
          <CardContent>
            {enrolledCourses.map((course) => (
              <div key={course.id} className="mb-4">
                <h3 className="font-semibold mb-2">{course.title}</h3>
                <div className="flex items-center">
                  <Progress value={course.progress} className="flex-grow mr-4" />
                  <span className="text-sm font-medium">{course.progress}%</span>
                </div>
                <Link href={`/user/courses/${course.id}`}>
                  <Button variant="link" className="mt-2 p-0">
                    Continue <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            {mockRecentAchievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center mb-4">
                <achievement.icon className="h-8 w-8 text-yellow-400 mr-3" />
                <div>
                  <h3 className="font-semibold">{achievement.title}</h3>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                </div>
              </div>
            ))}
            <Link href="/user/achievements">
              <Button variant="outline" className="w-full">
                View All Achievements
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {mockRecommendedCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`} className="flex">
                  <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col w-full">
                    <div className="relative w-full h-32">
                      <Image src={course.image} alt={course.title} layout="fill" objectFit="cover" />
                    </div>
                    <div className="p-2 flex-grow flex items-center">
                      <h3 className="font-semibold text-sm line-clamp-2">{course.title}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="analytics">
          <LearningAnalytics userType="learner" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
