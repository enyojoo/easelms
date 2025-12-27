"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, BookOpen, DollarSign, Activity, UserPlus } from "lucide-react"
import { useClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import Link from "next/link"
import AdminDashboardSkeleton from "@/components/AdminDashboardSkeleton"

interface DashboardStats {
  totalCourses: number
  totalLearners: number
  totalRevenue: number
  recentActivity: Array<{
    id: string
    type: "signup" | "enrollment" | "completion" | "payment"
    user: string
    course: string
    amount?: string
    time: string
    timestamp: number
  }>
}

// Helper function to format time as relative (e.g., "2 hours ago")
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days !== 1 ? "s" : ""} ago`
  }
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800)
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`
  }
  const months = Math.floor(diffInSeconds / 2592000)
  return `${months} month${months !== 1 ? "s" : ""} ago`
}

export default function InstructorDashboard() {
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [dashboardUser, setDashboardUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Check if user is instructor (instructors should not see revenue)
  const isInstructor = userType === "instructor"

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      setDashboardUser(user as User)
    }
  }, [user, authLoading])

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true)
        setStatsError(null)
        const response = await fetch("/api/admin/stats")
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch stats")
        }

        const data = await response.json()
        setStats(data)
      } catch (error: any) {
        console.error("Error fetching dashboard stats:", error)
        setStatsError(error.message || "Failed to load dashboard stats")
      } finally {
        setStatsLoading(false)
      }
    }

    if (!authLoading && dashboardUser) {
      fetchStats()
    }
  }, [authLoading, dashboardUser])

  // Always render page structure, show skeleton for content if loading
  const isLoading = !mounted || authLoading || !dashboardUser

  // Extract first name from full name
  const firstName = dashboardUser?.name?.split(" ")[0] || dashboardUser?.name || "there"

  return (
    <div className="pt-4 md:pt-8 h-[calc(100vh-8rem)] flex flex-col">
      {isLoading ? (
        <AdminDashboardSkeleton />
      ) : (
        <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Hi, {firstName}!</h1>
      </div>

      <div className={`grid grid-cols-1 ${isInstructor ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6 mb-6`}>
        {!isInstructor && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2" /> Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-10 w-24" />
              ) : statsError ? (
                <p className="text-sm text-destructive">Error loading revenue</p>
              ) : (
                <>
                  <p className="text-3xl font-bold">
                    ${stats?.totalRevenue?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2" /> Total Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : statsError ? (
              <p className="text-sm text-destructive">Error loading learners</p>
            ) : (
              <p className="text-3xl font-bold">{stats?.totalLearners?.toLocaleString() || "0"}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2" /> Total Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : statsError ? (
              <p className="text-sm text-destructive">Error loading courses</p>
            ) : (
              <p className="text-3xl font-bold">{stats?.totalCourses?.toLocaleString() || "0"}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Full width */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Card className="flex flex-col min-h-0 h-full">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden">
            {statsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start space-x-3 pb-4 border-b">
                    <Skeleton className="h-4 w-4 rounded-full mt-1" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : statsError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-destructive">{statsError}</p>
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="h-full overflow-y-auto pr-2 space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex-shrink-0 mt-1">
                      {activity.type === "signup" && <UserPlus className="h-4 w-4 text-orange-500" />}
                      {activity.type === "enrollment" && <BookOpen className="h-4 w-4 text-blue-500" />}
                      {activity.type === "completion" && <BookOpen className="h-4 w-4 text-green-500" />}
                      {activity.type === "payment" && <DollarSign className="h-4 w-4 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {activity.type === "signup" && `${activity.user} signed up`}
                        {activity.type === "enrollment" && `${activity.user} enrolled in`}
                        {activity.type === "completion" && `${activity.user} completed`}
                        {activity.type === "payment" && `${activity.user} purchased`}
                      </p>
                      {activity.course && <p className="text-sm text-muted-foreground truncate">{activity.course}</p>}
                      {activity.amount && <p className="text-sm font-semibold text-green-600">{activity.amount}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(activity.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  )
}
