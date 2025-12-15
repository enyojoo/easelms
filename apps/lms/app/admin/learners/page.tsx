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
import { users } from "@/data/users"
import { modules } from "@/data/courses"
import type { User } from "@/data/users"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

export default function LearnersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>("all")
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>("")

  useEffect(() => {
    // Filter out admin users and apply search
    const userLearners = users.filter((user) => user.userType === "user")
    let filtered = userLearners.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Apply enrollment filter
    if (enrollmentFilter === "enrolled") {
      filtered = filtered.filter((user) => user.enrolledCourses.length > 0)
    } else if (enrollmentFilter === "not-enrolled") {
      filtered = filtered.filter((user) => user.enrolledCourses.length === 0)
    }

    setFilteredUsers(filtered)
  }, [searchTerm, enrollmentFilter])

  const handleEnrollClick = (user: User) => {
    setSelectedUser(user)
    setEnrollDialogOpen(true)
  }

  const handleEnrollConfirm = () => {
    if (selectedUser && selectedCourse) {
      // Mock enrollment - in real app, this would call an API
      toast.success(`Enrolled ${selectedUser.name} in course`)
      setEnrollDialogOpen(false)
      setSelectedUser(null)
      setSelectedCourse("")
    }
  }

  const getCourseTitle = (courseId: number) => {
    const course = modules.find((m) => m.id === courseId)
    return course?.title || `Course ${courseId}`
  }

  const getTotalEnrolled = () => {
    return users.filter((u) => u.userType === "user").length
  }

  const getTotalCoursesEnrolled = () => {
    return users
      .filter((u) => u.userType === "user")
      .reduce((sum, user) => sum + user.enrolledCourses.length, 0)
  }

  const getTotalCompleted = () => {
    return users
      .filter((u) => u.userType === "user")
      .reduce((sum, user) => sum + user.completedCourses.length, 0)
  }

  return (
    <div className="pt-4 md:pt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Learners Management</h1>
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
            <p className="text-3xl font-bold">{getTotalEnrolled()}</p>
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
                  <TableHead className="w-[30%] min-w-[200px]">Learner</TableHead>
                  <TableHead className="w-[25%] min-w-[180px]">Email</TableHead>
                  <TableHead className="w-[30%]">Enrolled Courses</TableHead>
                  <TableHead className="w-[15%] min-w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No learners found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="w-[30%] min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={user.profileImage} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{user.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[25%] min-w-[180px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[30%]">
                        <div className="flex flex-wrap gap-2">
                          {user.enrolledCourses.length > 0 ? (
                            user.enrolledCourses.map((courseId) => (
                              <Badge key={courseId} variant="secondary" className="text-xs">
                                {getCourseTitle(courseId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No courses</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="w-[15%] min-w-[180px]">
                        <div className="flex gap-2 flex-wrap">
                          <Link href={`/admin/learners/${user.id}`}>
                            <Button variant="outline" size="sm" className="whitespace-nowrap">
                              View Details
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEnrollClick(user)}
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
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnrollConfirm} disabled={!selectedCourse}>
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
