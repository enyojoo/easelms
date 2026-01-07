"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Mail, BookOpen, Award, TrendingUp, Filter, Plus, Loader2 } from "lucide-react"
import AdminLearnersSkeleton from "@/components/AdminLearnersSkeleton"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useClientAuthState } from "@/utils/client-auth"
import { useLearners, useInvalidateLearners, useAdminStats, useRealtimeAdminStats, useCourses } from "@/lib/react-query/hooks"

interface Learner {
  id: string
  name: string
  email: string
  profileImage: string
  enrolledCourses: number[]
  completedCourses: number[]
  progress: { [courseId: number]: number }
}

interface Course {
  id: number
  title: string
}

interface Stats {
  totalLearners: number
}

export default function LearnersPage() {
  const router = useRouter()
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [searchTerm, setSearchTerm] = useState("")
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>("all")
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Learner | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const [enrolling, setEnrolling] = useState(false)

  // Use React Query hooks for data fetching with caching
  const { data: learnersData, isPending: learnersPending, error: learnersError } = useLearners({
    search: searchTerm || undefined,
    enrollmentFilter: enrollmentFilter !== "all" ? enrollmentFilter : undefined,
  })
  
  const { data: stats, isPending: statsPending, error: statsError } = useAdminStats()
  
  // Set up real-time subscription for admin stats (which also affects learners)
  useRealtimeAdminStats()
  
  // Get cache invalidation function
  const invalidateLearners = useInvalidateLearners()
  
  // Fetch courses for enrollment dialog (only when dialog is open)
  const { data: coursesData, isPending: coursesPending } = useCourses()
  const courses = useMemo(() => coursesData?.courses || [], [coursesData])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading) {
      const isAdmin = userType === "admin"
      const isInstructor = (userType as string) === "instructor"
      if (!user || (!isAdmin && !isInstructor)) {
        router.push("/auth/admin/login")
      }
    }
  }, [user, userType, authLoading, router])

  // Process learners data from React Query
  const learners = useMemo(() => {
    if (!learnersData?.learners) return []
    return learnersData.learners.map((learner: any) => ({
      id: learner.id,
      name: learner.name,
      email: learner.email,
      profileImage: learner.profileImage || learner.profile_image || "",
      enrolledCourses: learner.enrolledCourses || [],
      completedCourses: learner.completedCourses || [],
      progress: learner.progress || {},
    }))
  }, [learnersData])

  // API already handles filtering, so filteredLearners is just the learners
  const filteredLearners = learners

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  // Show cached data instantly even if isPending is true
  const hasCachedData = !!learnersData?.learners
  const showSkeleton = (authLoading || !user || (userType !== "admin" && userType !== "instructor")) && !hasCachedData && learnersPending

  const handleEnrollClick = (learner: Learner) => {
    setSelectedUser(learner)
    setEnrollDialogOpen(true)
  }

  const handleEnrollConfirm = async () => {
    if (!selectedUser || !selectedCourse) return

    try {
      setEnrolling(true)
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: parseInt(selectedCourse),
          userId: selectedUser.id, // We need to pass userId for admin enrollment
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || "Failed to enroll learner"
        
        // Check if user is already enrolled (409 Conflict)
        if (response.status === 409) {
          toast.error(`${selectedUser.name} is already enrolled in this course`)
        } else {
          toast.error(errorMessage)
        }
        throw new Error(errorMessage)
      }

      toast.success(`Enrolled ${selectedUser.name} in course`)
      setEnrollDialogOpen(false)
      setSelectedUser(null)
      setSelectedCourse("")

      // Invalidate learners and stats cache to trigger refetch
      invalidateLearners()
    } catch (err: any) {
      console.error("Error enrolling learner:", err)
      toast.error(err.message || "Failed to enroll learner")
    } finally {
      setEnrolling(false)
    }
  }

  const getTotalEnrolled = () => {
    // Use stats from API (same as dashboard) for total learners count
    return stats?.totalLearners || 0
  }

  const getTotalCoursesEnrolled = () => {
    return learners.reduce((sum, learner) => sum + learner.enrolledCourses.length, 0)
  }

  const getTotalCompleted = () => {
    return learners.reduce((sum, learner) => sum + learner.completedCourses.length, 0)
  }

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  // Show cached data instantly even if isPending is true
  // Note: hasCachedData is already defined above

  return (
    <div className="pt-4 md:pt-8">
      {showSkeleton ? (
        <AdminLearnersSkeleton />
      ) : (
        <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Learner Management</h1>
          <p className="text-muted-foreground">
            View and manage all learners enrolled in courses
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Mail className="mr-2 h-4 w-4" />
              Total Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsPending ? (
              <div className="flex items-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : statsError ? (
              <p className="text-sm text-destructive">Error loading stats</p>
            ) : (
              <p className="text-3xl font-bold">{getTotalEnrolled()}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <BookOpen className="mr-2 h-4 w-4" />
              Total Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{getTotalCoursesEnrolled()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Award className="mr-2 h-4 w-4" />
              Completed Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{getTotalCompleted()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle>All Learners</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Learners</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="not-enrolled">Not Enrolled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%] min-w-[200px]">Learner</TableHead>
                  <TableHead className="w-[35%] min-w-[180px]">Email</TableHead>
                  <TableHead className="w-[30%] min-w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learnersError ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-destructive">
                      {learnersError.message || "Failed to load learners"}
                    </TableCell>
                  </TableRow>
                ) : filteredLearners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No learners found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLearners.map((learner) => (
                    <TableRow key={learner.id}>
                      <TableCell className="w-[35%] min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={learner.profileImage} alt={learner.name} />
                            <AvatarFallback>{learner.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{learner.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[35%] min-w-[180px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{learner.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[30%] min-w-[180px]">
                        <div className="flex gap-2 flex-wrap">
                          <Link href={`/admin/learners/${learner.id}`}>
                            <Button variant="outline" size="sm" className="whitespace-nowrap">
                              View Details
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnrollClick(learner)}
                            className="whitespace-nowrap"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Enroll
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Learner in Course</DialogTitle>
            <DialogDescription>
              Select a course to enroll {selectedUser?.name} in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Course</label>
              {coursesPending ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                    {courses.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No courses available</div>
                    ) : (
                      courses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.title}
                    </SelectItem>
                      ))
                    )}
                </SelectContent>
              </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)} disabled={enrolling}>
              Cancel
            </Button>
            <Button onClick={handleEnrollConfirm} disabled={!selectedCourse || enrolling || coursesPending}>
              {enrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                "Enroll"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  )
}
