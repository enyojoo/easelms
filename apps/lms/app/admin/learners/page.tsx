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
import { Search, Mail, BookOpen, Award, TrendingUp } from "lucide-react"
import { users } from "@/data/users"
import { modules } from "@/data/courses"
import type { User } from "@/data/users"
import Link from "next/link"

export default function LearnersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])

  useEffect(() => {
    // Filter out admin users and apply search
    const userLearners = users.filter((user) => user.userType === "user")
    const filtered = userLearners.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredUsers(filtered)
  }, [searchTerm])

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
          <div className="flex items-center justify-between">
            <CardTitle>All Learners</CardTitle>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrolled Courses</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No learners found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.profileImage} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <div className="space-y-1">
                          {user.enrolledCourses.length > 0 ? (
                            user.enrolledCourses.map((courseId) => {
                              const progress = user.progress[courseId] || 0
                              return (
                                <div key={courseId} className="flex items-center gap-2">
                                  <div className="flex-1 min-w-[60px]">
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-xs text-muted-foreground w-10 text-right">
                                    {progress}%
                                  </span>
                                </div>
                              )
                            })
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{user.completedCourses.length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/learners/${user.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
