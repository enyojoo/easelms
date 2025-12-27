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
  ShoppingBag,
  XCircle,
  Loader2,
} from "lucide-react"
import { useClientAuthState } from "@/utils/client-auth"
import Link from "next/link"
import { toast } from "sonner"
import AdminLearnerDetailSkeleton from "@/components/AdminLearnerDetailSkeleton"

interface Learner {
  id: string
  name: string
  email: string
  profileImage: string
  bio?: string
  currency: string
  enrolledCourses: number[]
  completedCourses: number[]
  progress: { [courseId: number]: number }
  created_at?: string
}

interface Course {
  id: number
  title: string
  image?: string
  lessons?: Array<{ id: number }>
  enrolledStudents?: number
}

interface Purchase {
  id: string
  courseId: number
  courseTitle: string
  courseImage?: string
  amount: number
  currency: string
  gateway?: string
  status: string
  type: "one-time" | "recurring"
  recurringPrice?: number
  purchasedAt: string
  completedAt?: string
  cancelledAt?: string
}

export default function LearnerDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [learner, setLearner] = useState<Learner | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && (!user || (userType !== "admin" && userType !== "instructor"))) {
      router.push("/auth/admin/login")
    }
  }, [user, userType, authLoading, router])

  // Fetch learner data
  useEffect(() => {
    const fetchLearner = async () => {
      if (!mounted || authLoading || !user || (userType !== "admin" && userType !== "instructor")) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/learners/${params.id}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch learner")
        }

        const data = await response.json()
        setLearner(data.learner)
      } catch (err: any) {
        console.error("Error fetching learner:", err)
        setError(err.message || "Failed to load learner")
        toast.error(err.message || "Failed to load learner")
      } finally {
        setLoading(false)
      }
    }

    fetchLearner()
  }, [params.id, mounted, authLoading, user, userType])

  // Fetch courses data
  useEffect(() => {
    const fetchCourses = async () => {
      if (!learner || learner.enrolledCourses.length === 0) return

      try {
        const courseIds = learner.enrolledCourses.join(",")
        const response = await fetch(`/api/courses?ids=${courseIds}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch courses")
        }

        const data = await response.json()
        setCourses(data.courses || [])
      } catch (err: any) {
        console.error("Error fetching courses:", err)
        // Don't show error toast for courses, just log it
      }
    }

    fetchCourses()
  }, [learner])

  // Fetch purchases
  useEffect(() => {
    const fetchPurchases = async () => {
      if (!mounted || authLoading || !user || !params.id) return

      try {
        const response = await fetch(`/api/learners/${params.id}/purchases`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          // Don't throw error for purchases, just log it
          console.warn("Error fetching purchases:", errorData.error)
          return
        }

        const data = await response.json()
        setPurchases(data.purchases || [])
      } catch (err: any) {
        console.error("Error fetching purchases:", err)
        // Don't show error toast for purchases, just log it
      }
    }

    fetchPurchases()
  }, [params.id, mounted, authLoading, user])

  const isLoading = !mounted || authLoading || !user || (userType !== "admin" && userType !== "instructor") || loading

  if (isLoading) {
    return <AdminLearnerDetailSkeleton />
  }

  if (error || !learner) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="text-center py-8">
          <p className="text-destructive mb-4">{error || "Learner not found"}</p>
          <Link href="/admin/learners">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learners
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const getCourseTitle = (courseId: number) => {
    const course = courses.find((c) => c.id === courseId)
    return course?.title || `Course ${courseId}`
  }

  const getCourse = (courseId: number) => {
    return courses.find((c) => c.id === courseId)
  }

  const enrolledCourses = learner.enrolledCourses
    .map((courseId) => getCourse(courseId))
    .filter((course): course is Course => course !== undefined)
  
  const completedCourses = learner.completedCourses
    .map((courseId) => getCourse(courseId))
    .filter((course): course is Course => course !== undefined)

  // Calculate average progress
  const avgProgress = learner.enrolledCourses.length > 0
    ? Math.round(
        (learner.enrolledCourses.reduce((sum, id) => sum + (learner.progress[id] || 0), 0) /
          learner.enrolledCourses.length) *
          10
      ) / 10
    : 0

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
                  <DollarSign className="h-4 w-4" />
                  <span>Currency: {learner.currency || "USD"}</span>
                </div>
                {learner.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined: {new Date(learner.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
              <Calendar className="mr-2 h-4 w-4" />
              Avg Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgProgress}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Details */}
      <Tabs defaultValue="enrollments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
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
                            <span>{course.lessons?.length || 0} lessons</span>
                            <span>{course.enrolledStudents || 0} learners</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1 text-center">{progress}%</p>
                          </div>
                          <Link href={`/admin/courses/${course.id}`}>
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
                    const course = getCourse(courseId)
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

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Purchase History ({purchases.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length > 0 ? (
                <div className="space-y-4">
                  {purchases.map((purchase) => {
                    const course = getCourse(purchase.courseId)
                    const isSubscription = purchase.type === "recurring"
                    const isActive = purchase.status === "completed" || purchase.status === "active"
                    
                    return (
                      <Card key={purchase.id} className={!isActive ? "opacity-75" : ""}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="font-semibold text-lg mb-1">{purchase.courseTitle}</h3>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                      variant={isSubscription ? "secondary" : "outline"}
                                      className={
                                        isSubscription
                                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                      }
                                    >
                                      {isSubscription ? "Subscription" : "One-time Purchase"}
                                    </Badge>
                                    <Badge
                                      variant={isActive ? "default" : "secondary"}
                                      className={
                                        isActive
                                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                      }
                                    >
                                      {isActive ? "Active" : purchase.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm text-muted-foreground mt-3">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  <span>
                                    {purchase.currency || "USD"} {purchase.amount}
                                    {isSubscription && purchase.recurringPrice && " /month"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    Purchased: {new Date(purchase.purchasedAt).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                                {purchase.cancelledAt && (
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4" />
                                    <span>
                                      Cancelled: {new Date(purchase.cancelledAt).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 md:items-end">
                              {course && (
                                <Link href={`/admin/courses/${course.id}`}>
                                  <Button variant="outline" size="sm">
                                    View Course
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No purchases found for this learner.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

