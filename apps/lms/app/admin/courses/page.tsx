"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BookOpen, Edit, Trash2, Eye, Clock, Banknote, Filter, Loader2 } from "lucide-react"
import { getClientAuthState } from "@/utils/client-auth"
import { modules } from "@/data/courses"
import type { User } from "@/data/users"
import { toast } from "sonner"

export default function ManageCoursesPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priceFilter, setPriceFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null)

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "admin") {
      router.push("/auth/admin/login")
    } else {
      setUser(user)
    }
  }, [router])

  if (!user) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const handleDeleteClick = (courseId: number) => {
    setCourseToDelete(courseId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (courseToDelete) {
      // Mock deletion - in real app, this would call an API
      toast.success("Course deleted successfully")
      setDeleteDialogOpen(false)
      setCourseToDelete(null)
    }
  }

  const filteredCourses = modules.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || (statusFilter === "published" && course.settings?.isPublished) || (statusFilter === "draft" && !course.settings?.isPublished)
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && (!course.price || course.price === 0)) ||
      (priceFilter === "paid" && course.price && course.price > 0)
    return matchesSearch && matchesStatus && matchesPrice
  })

  const renderCourseCard = (course: typeof modules[0]) => (
    <Card key={course.id} className="flex flex-col h-full">
      <CardHeader className="p-6">
        <div className="aspect-video relative rounded-md overflow-hidden mb-4">
          <Image
            src={course.image || "/placeholder.svg?height=200&width=300"}
            alt={course.title}
            fill
            className="object-cover"
          />
        </div>
        <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 mr-1" />
            <span>{course.lessons.length} lessons</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>4 hours</span>
          </div>
          <div className="flex items-center">
            <Banknote className="w-4 h-4 mr-1" />
            <span>
              {(() => {
                const enrollmentMode = course.settings?.enrollment?.enrollmentMode
                const price = course.settings?.enrollment?.price || course.price
                const recurringPrice = course.settings?.enrollment?.recurringPrice
                
                if (enrollmentMode === "recurring" && recurringPrice) {
                  return `$${recurringPrice}`
                } else if (enrollmentMode === "buy" && price) {
                  return `$${price}`
                } else if (enrollmentMode === "free") {
                  return "Free"
                } else if (price) {
                  return `$${price}`
                } else {
                  return "Free"
                }
              })()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow px-6 pb-6">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{course.description}</p>
      </CardContent>
      <CardFooter className="flex gap-2 p-6 pt-0 justify-center">
        <Link href={`/admin/courses/preview/${course.id}`} passHref>
          <Button variant="outline" className="flex items-center w-full justify-center text-sm py-1">
            <Eye className="mr-1 h-4 w-4" /> Preview
          </Button>
        </Link>
        <Link href={`/admin/courses/new?edit=${course.id}`}>
          <Button variant="outline" className="flex items-center w-full justify-center text-sm py-1">
            <Edit className="mr-1 h-4 w-4" /> Edit
          </Button>
        </Link>
        <Button
          variant="destructive"
          className="flex items-center w-full justify-center text-sm py-1"
          onClick={() => handleDeleteClick(course.id)}
        >
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </CardFooter>
    </Card>
  )

  return (
    <div className=" pt-4 md:pt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Course Management</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage all courses in your learning platform
          </p>
        </div>
        <Link href="/admin/courses/new" passHref>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <BookOpen className="mr-2 h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              id="search"
              type="text"
              placeholder="Search by course title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filteredCourses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No courses found matching your filters.
          </div>
        )}
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No courses found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" || priceFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first course"}
          </p>
          {(!searchTerm && statusFilter === "all" && priceFilter === "all") && (
            <Link href="/admin/courses/new">
              <Button>
                <BookOpen className="mr-2 h-4 w-4" />
                Create Course
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(renderCourseCard)}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
