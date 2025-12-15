"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, DollarSign, TrendingUp, Activity, PlusCircle, Settings, FileText } from "lucide-react"
import { getClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import Link from "next/link"

// Mock data for recent activity
const mockRecentActivity = [
  { id: 1, type: "enrollment", user: "John Doe", course: "Digital Marketing & Social Media", time: "2 hours ago" },
  { id: 2, type: "completion", user: "Sarah Johnson", course: "Startup Fundamentals", time: "5 hours ago" },
  { id: 3, type: "enrollment", user: "Mike Wilson", course: "Public Speaking & Communication", time: "1 day ago" },
  { id: 4, type: "payment", user: "Emily Brown", course: "Tech Skills (No-code, AI Basics)", amount: "$199", time: "1 day ago" },
  { id: 5, type: "completion", user: "David Lee", course: "Basic Money Management", time: "2 days ago" },
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

      {/* Quick Actions */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/courses/new">
                <Button className="h-auto py-4 flex flex-col items-center w-full" variant="outline">
                  <PlusCircle className="mb-2 h-5 w-5" />
                  <span>Create Course</span>
                </Button>
              </Link>
              <Link href="/admin/courses">
                <Button className="h-auto py-4 flex flex-col items-center w-full" variant="outline">
                  <BookOpen className="mb-2 h-5 w-5" />
                  <span>Manage Courses</span>
                </Button>
              </Link>
              <Link href="/admin/learners">
                <Button className="h-auto py-4 flex flex-col items-center w-full" variant="outline">
                  <Users className="mb-2 h-5 w-5" />
                  <span>View Learners</span>
                </Button>
              </Link>
              <Link href="/admin/settings">
                <Button className="h-auto py-4 flex flex-col items-center w-full" variant="outline">
                  <Settings className="mb-2 h-5 w-5" />
                  <span>Settings</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex-shrink-0 mt-1">
                    {activity.type === "enrollment" && <Users className="h-4 w-4 text-blue-500" />}
                    {activity.type === "completion" && <BookOpen className="h-4 w-4 text-green-500" />}
                    {activity.type === "payment" && <DollarSign className="h-4 w-4 text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {activity.type === "enrollment" && `${activity.user} enrolled in`}
                      {activity.type === "completion" && `${activity.user} completed`}
                      {activity.type === "payment" && `${activity.user} purchased`}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{activity.course}</p>
                    {activity.amount && <p className="text-sm font-semibold text-green-600">{activity.amount}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
