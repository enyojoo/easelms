"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, BookOpen, DollarSign, Activity, UserPlus, Award } from "lucide-react"
import { useClientAuthState } from "@/utils/client-auth"
import { useAdminStats, useRealtimeAdminStats, useProfile } from "@/lib/react-query/hooks"
import type { User } from "@/data/users"
import Link from "next/link"
import AdminDashboardSkeleton from "@/components/AdminDashboardSkeleton"

interface DashboardStats {
  totalCourses: number
  totalLearners: number
  totalRevenue: number
  totalCompleted: number
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
  const { data: profileData } = useProfile() // Get cached profile data
  const [mounted, setMounted] = useState(false)
  
  // Check if user is instructor (instructors should not see revenue)
  const isInstructor = userType === "instructor"

  // Use React Query hooks for data fetching
  const { data: stats, isPending: statsPending, error: statsError } = useAdminStats()
  
  // Set up real-time subscription for admin stats
  useRealtimeAdminStats()

  // Use profile data from React Query cache (instant, no fetching)
  const dashboardUser = profileData?.profile || (user ? { name: user.name, email: user.email, profileImage: user.profileImage } : null)

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  const hasData = !!stats
  const showSkeleton = (authLoading || !dashboardUser) && !hasData

  // Extract first name from full name
  const firstName = dashboardUser?.name?.split(" ")[0] || dashboardUser?.name || "there"

  return (
    <div className="pt-4 md:pt-8 h-[calc(100vh-8rem)] flex flex-col">
      {showSkeleton ? (
        <AdminDashboardSkeleton />
      ) : (
        <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">
          {dashboardUser?.name ? `Hi, ${firstName}!` : <span className="h-9 w-48 bg-muted animate-pulse rounded inline-block" />}
        </h1>
      </div>

      <div className={`grid grid-cols-1 ${isInstructor ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-6 mb-6`}>
        {!isInstructor && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <DollarSign className="mr-2 h-4 w-4" /> Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsError ? (
                <p className="text-sm text-destructive">Error loading revenue</p>
              ) : (
                  <p className="text-2xl font-bold">
                    ${stats?.totalRevenue?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                  </p>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Users className="mr-2 h-4 w-4" /> Total Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsError ? (
              <p className="text-sm text-destructive">Error loading learners</p>
            ) : (
              <p className="text-2xl font-bold">{stats?.totalLearners?.toLocaleString() || "0"}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <BookOpen className="mr-2 h-4 w-4" /> Total Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsError ? (
              <p className="text-sm text-destructive">Error loading courses</p>
            ) : (
              <p className="text-2xl font-bold">{stats?.totalCourses?.toLocaleString() || "0"}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Award className="mr-2 h-4 w-4" /> Total Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsError ? (
              <p className="text-sm text-destructive">Error loading completed</p>
            ) : (
              <p className="text-2xl font-bold">{stats?.totalCompleted?.toLocaleString() || "0"}</p>
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
            {statsError ? (
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
