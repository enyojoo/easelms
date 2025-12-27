"use client"

import { useState, useEffect } from "react"
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
  const [learners, setLearners] = useState<Learner[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredLearners, setFilteredLearners] = useState<Learner[]>([])
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Learner | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Fetch stats (for total learners count)
  useEffect(() => {
    const fetchStats = async () => {
      const isAdmin = userType === "admin"
      const isInstructor = (userType as string) === "instructor"
      if (!mounted || authLoading || !user || (!isAdmin && !isInstructor)) return

      try {
        setStatsLoading(true)
        const response = await fetch("/api/admin/stats")
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch stats")
        }

        const data = await response.json()
        setStats({ totalLearners: data.totalLearners || 0 })
      } catch (err: any) {
        console.error("Error fetching stats:", err)
        // Don't show error toast for stats, just log it
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
  }, [mounted, authLoading, user, userType])

  // Fetch learners
  useEffect(() => {
    const fetchLearners = async () => {
      const isAdmin = userType === "admin"
      const isInstructor = (userType as string) === "instructor"
      if (!mounted || authLoading || !user || (!isAdmin && !isInstructor)) return

      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (searchTerm) {
          params.append("search", searchTerm)
        }
        if (enrollmentFilter !== "all") {
          params.append("enrollmentFilter", enrollmentFilter)
        }

        const response = await fetch(`/api/learners?${params.toString()}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch learners")
        }

        const data = await response.json()
        setLearners(data.learners || [])
      } catch (err: any) {
        console.error("Error fetching learners:", err)
        setError(err.message || "Failed to load learners")
        toast.error(err.message || "Failed to load learners")
      } finally {
        setLoading(false)
      }
    }

    fetchLearners()
  }, [mounted, authLoading, user, userType, searchTerm, enrollmentFilter])

  // Fetch courses for enrollment dialog
  useEffect(() => {
    const fetchCourses = async () => {
      if (!enrollDialogOpen) return

      try {
        setCoursesLoading(true)
        const response = await fetch("/api/courses")
        if (!response.ok) {
          throw new Error("Failed to fetch courses")
        }
        const data = await response.json()
        setCourses(data.courses || [])
      } catch (err: any) {
        console.error("Error fetching courses:", err)
        toast.error("Failed to load courses")
      } finally {
        setCoursesLoading(false)
      }
    }

    fetchCourses()
  }, [enrollDialogOpen])

  // Filter learners based on search and enrollment filter
  useEffect(() => {
    let filtered = [...learners]

    // Apply enrollment filter (API already filters, but we do client-side for search)
    if (enrollmentFilter === "enrolled") {
      filtered = filtered.filter((learner) => learner.enrolledCourses.length > 0)
    } else if (enrollmentFilter === "not-enrolled") {
      filtered = filtered.filter((learner) => learner.enrolledCourses.length === 0)
    }

    setFilteredLearners(filtered)
  }, [learners, enrollmentFilter])

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
        throw new Error(errorData.error || "Failed to enroll learner")
      }

      toast.success(`Enrolled ${selectedUser.name} in course`)
      setEnrollDialogOpen(false)
      setSelectedUser(null)
      setSelectedCourse("")

      // Refresh learners list
      const params = new URLSearchParams()
      if (searchTerm) {
        params.append("search", searchTerm)
      }
      if (enrollmentFilter !== "all") {
        params.append("enrollmentFilter", enrollmentFilter)
      }

      const refreshResponse = await fetch(`/api/learners?${params.toString()}`)
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        setLearners(refreshData.learners || [])
      }
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
  const hasData = learners.length > 0 || stats
  const showSkeleton = (authLoading || !user || userType !== "admin") && !hasData

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
            {statsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
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
                {error ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-destructive">
                      {error}
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
              {coursesLoading ? (
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
            <Button onClick={handleEnrollConfirm} disabled={!selectedCourse || enrolling || coursesLoading}>
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
