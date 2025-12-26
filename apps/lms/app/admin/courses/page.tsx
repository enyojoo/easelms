"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Badge } from "@/components/ui/badge"
import AdminCoursesSkeleton from "@/components/AdminCoursesSkeleton"
import { useClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import { toast } from "sonner"

interface Course {
  id: number
  title: string
  description: string
  image: string
  lessons: Array<{ id?: string | number }>
  price?: number
  settings?: {
    isPublished?: boolean
    enrollment?: {
      enrollmentMode?: "open" | "free" | "buy" | "recurring" | "closed"
      price?: number
      recurringPrice?: number
    }
  }
}

export default function ManageCoursesPage() {
  const router = useRouter()
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priceFilter, setPriceFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [draftCourses, setDraftCourses] = useState<Course[]>([])

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && (!user || (userType !== "admin" && userType !== "instructor"))) {
      router.push("/auth/admin/login")
    }
  }, [user, userType, authLoading, router])

  // Load draft courses from localStorage
  const loadDrafts = useCallback(() => {
    if (typeof window === "undefined") return []
    
    try {
      const drafts: Course[] = []
      // Check for draft with key "course-draft-new"
      const draftKey = "course-draft-new"
      const draftJson = localStorage.getItem(draftKey)
      
      if (draftJson) {
        try {
          const draft = JSON.parse(draftJson)
          const draftData = draft.data
          
          if (draftData && draftData.basicInfo && (draftData.basicInfo.title || Object.keys(draftData).length > 0)) {
            // Extract description HTML to plain text for preview
            let descriptionText = ""
            if (draftData.basicInfo.description) {
              try {
                const tempDiv = document.createElement("div")
                tempDiv.innerHTML = draftData.basicInfo.description
                descriptionText = tempDiv.textContent || tempDiv.innerText || ""
              } catch (e) {
                // Fallback: strip HTML tags with regex
                descriptionText = draftData.basicInfo.description.replace(/<[^>]*>/g, "").substring(0, 150)
              }
            }
            
            drafts.push({
              id: -1, // Use negative ID to indicate draft
              title: draftData.basicInfo.title || "Untitled Course",
              description: descriptionText || "No description",
              image: draftData.basicInfo.thumbnail || "/placeholder.svg?height=200&width=300",
              lessons: Array.isArray(draftData.lessons) ? draftData.lessons : [],
              price: parseFloat(draftData.basicInfo.price) || 0,
              settings: {
                isPublished: false, // Drafts are never published
                ...(draftData.settings || {}),
              },
            })
          }
        } catch (e) {
          console.error("Error parsing draft:", e)
        }
      }
      
      return drafts
    } catch (err) {
      console.error("Error loading drafts:", err)
      return []
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    setDraftCourses(loadDrafts())
  }, [mounted, loadDrafts])

  // Refresh drafts when page becomes visible (user returns from course builder)
  useEffect(() => {
    if (!mounted) return
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setDraftCourses(loadDrafts())
      }
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", () => setDraftCourses(loadDrafts()))
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", () => setDraftCourses(loadDrafts()))
    }
  }, [mounted, loadDrafts])

  // Fetch courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      if (!mounted || authLoading || !user || (userType !== "admin" && userType !== "instructor")) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/courses?all=true")
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch courses")
        }

        const data = await response.json()
        const fetchedCourses = data.courses || []

        // Map API response to match UI expectations
        const mappedCourses: Course[] = fetchedCourses.map((course: any) => {
          // Parse settings if it's a string
          let settings = course.settings
          if (typeof settings === 'string') {
            try {
              settings = JSON.parse(settings)
            } catch (e) {
              settings = {}
            }
          }

          // Map is_published to settings.isPublished
          if (course.is_published !== undefined && settings) {
            settings.isPublished = course.is_published
          }

          return {
            id: course.id,
            title: course.title || "",
            description: course.description || "",
            image: course.image || course.thumbnail || "/placeholder.svg?height=200&width=300",
            lessons: Array.isArray(course.lessons) ? course.lessons : [],
            price: course.price || 0,
            settings: settings || { isPublished: course.is_published || false },
          }
        })

        setCourses(mappedCourses)
      } catch (err: any) {
        console.error("Error fetching courses:", err)
        setError(err.message || "Failed to load courses")
        toast.error(err.message || "Failed to load courses")
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [mounted, authLoading, user, userType, router])

  // Always render page structure, show skeleton for content if loading
  const isLoading = !mounted || authLoading || !user || (userType !== "admin" && userType !== "instructor") || loading

  const handleDeleteClick = (courseId: number) => {
    setCourseToDelete(courseId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/courses/${courseToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete course")
      }

      toast.success("Course deleted successfully")
      setDeleteDialogOpen(false)
      setCourseToDelete(null)

      // Refresh courses list
      const refreshResponse = await fetch("/api/courses?all=true")
      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        const fetchedCourses = data.courses || []
        const mappedCourses: Course[] = fetchedCourses.map((course: any) => {
          let settings = course.settings
          if (typeof settings === 'string') {
            try {
              settings = JSON.parse(settings)
            } catch (e) {
              settings = {}
            }
          }
          if (course.is_published !== undefined && settings) {
            settings.isPublished = course.is_published
          }
          return {
            id: course.id,
            title: course.title || "",
            description: course.description || "",
            image: course.image || course.thumbnail || "/placeholder.svg?height=200&width=300",
            lessons: Array.isArray(course.lessons) ? course.lessons : [],
            price: course.price || 0,
            settings: settings || { isPublished: course.is_published || false },
          }
        })
        setCourses(mappedCourses)
      }
    } catch (err: any) {
      console.error("Error deleting course:", err)
      toast.error(err.message || "Failed to delete course")
    } finally {
      setDeleting(false)
    }
  }

  // Combine regular courses and draft courses
  const allCourses = [...draftCourses, ...courses]
  
  const filteredCourses = allCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase())
    const isDraft = course.id < 0 // Draft courses have negative IDs
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "published" && course.settings?.isPublished && !isDraft) || 
      (statusFilter === "draft" && (!course.settings?.isPublished || isDraft))
    const enrollmentPrice = course.settings?.enrollment?.price || course.price || 0
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && enrollmentPrice === 0) ||
      (priceFilter === "paid" && enrollmentPrice > 0)
    return matchesSearch && matchesStatus && matchesPrice
  })

  const renderCourseCard = (course: Course) => {
    const isDraft = course.id < 0
    
    return (
    <Card key={course.id} className="flex flex-col h-full">
      <CardHeader className="p-4 sm:p-6">
        <div className="aspect-video relative rounded-md overflow-hidden mb-3 sm:mb-4">
          <Image
            src={course.image || "/placeholder.svg?height=200&width=300"}
            alt={course.title}
            fill
            className="object-cover"
          />
          {isDraft && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-yellow-500/90 text-yellow-900">
                Draft
              </Badge>
            </div>
          )}
        </div>
        <CardTitle className="text-base sm:text-lg mb-2 line-clamp-2">{course.title}</CardTitle>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
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
      <CardContent className="flex-grow px-4 sm:px-6 pb-4 sm:pb-6">
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-3">{course.description}</p>
      </CardContent>
      <CardFooter className="flex flex-row gap-2 p-4 sm:p-6 pt-0">
        {!isDraft && (
          <Link href={`/admin/courses/preview/${course.id}`} className="flex-1">
            <Button 
              variant="outline" 
              className="flex items-center justify-center w-full h-8 text-xs"
              size="sm"
              title="Preview"
            >
              <Eye className="h-3.5 w-3.5" /> 
            </Button>
          </Link>
        )}
        <Link href={isDraft ? "/admin/courses/new" : `/admin/courses/new?edit=${course.id}`} className="flex-1">
          <Button 
            variant="outline" 
            className="flex items-center justify-center w-full h-8 text-xs"
            size="sm"
            title={isDraft ? "Continue Editing" : "Edit"}
          >
            <Edit className="h-3.5 w-3.5" /> 
          </Button>
        </Link>
        {!isDraft && (
          <Button
            variant="destructive"
            className="flex items-center justify-center flex-1 h-8 text-xs"
            size="sm"
            onClick={() => handleDeleteClick(course.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" /> 
          </Button>
        )}
        {isDraft && (
          <Button
            variant="destructive"
            className="flex items-center justify-center flex-1 h-8 text-xs"
            size="sm"
            onClick={() => {
              localStorage.removeItem("course-draft-new")
              setDraftCourses([])
              toast.success("Draft deleted")
            }}
            title="Delete Draft"
          >
            <Trash2 className="h-3.5 w-3.5" /> 
          </Button>
        )}
      </CardFooter>
    </Card>
    )
  }

  return (
    <div className="pt-4 md:pt-8">
      {isLoading ? (
        <AdminCoursesSkeleton />
      ) : error ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error loading courses</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      ) : (
        <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Course Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Create, edit, and manage all courses in your learning platform
          </p>
        </div>
        <Link href="/admin/courses/new" className="w-full sm:w-auto">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto min-h-[44px]">
            <BookOpen className="mr-2 h-4 w-4" /> Create Course
          </Button>
        </Link>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <Input
              id="search"
              type="text"
              placeholder="Search by course title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[44px] text-sm sm:text-base"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] min-h-[44px] text-sm sm:text-base">
                <Filter className="mr-2 h-4 w-4 flex-shrink-0" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full sm:w-[140px] min-h-[44px] text-sm sm:text-base">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4 lg:gap-5">
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
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      )}
    </div>
  )
}
