"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, MessageSquare, DollarSign, TrendingUp, Calendar } from "lucide-react"
import { getClientAuthState } from "@/app/utils/client-auth" // Corrected import
import type { User } from "@/app/data/users"
import Link from "next/link"

// Mock data for recent feedback
const mockRecentFeedback = [
  { course: "Digital Marketing & Social Media", comment: "Great course! Very informative." },
  { course: "Startup Fundamentals", comment: "The instructor explains concepts well." },
]

export default function InstructorDashboard() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const { user } = getClientAuthState() // Use client-side auth
    setUser(user)
  }, [])

  if (!user) {
    return <div className="p-4 md:p-8 pt-20 md:pt-24">Loading...</div>
  }

  return (
    <div className=" pt-4 md:pt-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Hi, {user.name}!</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2" /> Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">$45,231.89</p>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500 inline mr-1" />
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2" /> Total Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">2,350</p>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500 inline mr-1" />
              +15.2% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2" /> Total Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">2</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/manage-courses/new">
                <Button className="h-auto py-4 flex flex-col items-center w-full" variant="outline">
                  <BookOpen className="mb-2" />
                  <span>Create New Course</span>
                </Button>
              </Link>
              <Link href="/plan-workshops">
                <Button className="h-auto py-4 flex flex-col items-center w-full" variant="outline">
                  <Calendar className="mb-2" />
                  <span>Plan Workshops</span>
                </Button>
              </Link>
              <Link href="/in-messages">
                <Button className="h-auto py-4 flex flex-col items-center w-full" variant="outline">
                  <MessageSquare className="mb-2" />
                  <span>Message Learners</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">United States</span>
                  <span className="text-sm font-semibold">1,200 learners</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">India</span>
                  <span className="text-sm font-semibold">850 learners</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">United Kingdom</span>
                  <span className="text-sm font-semibold">620 learners</span>
                </div>
              </div>
            </div>
            <Link href="/in-report">
              <Button variant="outline" className="w-full mt-4">
                View Detailed Report
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {mockRecentFeedback.map((feedback) => (
              <div key={feedback.course} className="mb-4">
                <p className="font-semibold">{feedback.comment}</p>
                <p className="text-sm text-muted-foreground">Course: {feedback.course}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">78.5%</div>
            <p className="text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500 inline mr-1" />
              +5.1% from last month
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
