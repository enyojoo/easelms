"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createCourseSlug } from "@/lib/slug"
import SafeImage from "@/components/SafeImage"
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
import { formatCurrency } from "@/lib/utils/currency"
import { useCourses, useRealtimeCourses, useInvalidateCourses, useSettings } from "@/lib/react-query/hooks"

interface Course {
  id: number
  title: string
  description: string
  image: string
  lessons: Array<{ id?: string | number; estimatedDuration?: number }>
  price?: number
  totalDurationMinutes?: number
  totalHours?: number
  settings?: {
    isPublished?: boolean
    enrollment?: {
      enrollmentMode?: "open" | "free" | "buy" | "closed"
      price?: number
    }
  }
  _localStorageCourseId?: any // For tracking localStorage draft matching
}

export default function ManageCoursesPage() {
  const router = useRouter()
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priceFilter, setPriceFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [draftCourses, setDraftCourses] = useState<Course[]>([])

  // Use React Query hooks for data fetching with caching
  const { data: coursesData, isPending: coursesPending, error: coursesError } = useCourses({ all: true })
  const { data: settingsData } = useSettings()

  // Set up real-time subscription for courses
  useRealtimeCourses()

  // Get cache invalidation function
  const invalidateCourses = useInvalidateCourses()

  // Get platform default currency
  const defaultCurrency = settingsData?.platformSettings?.default_currency || "USD"

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
      
      // Check all localStorage keys that start with "course-draft-"
      const allKeys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("course-draft-")) {
          allKeys.push(key)
        }
      }
      
      // Process each draft key
      allKeys.forEach((draftKey) => {
        const draftJson = localStorage.getItem(draftKey)
        if (!draftJson) return
        
        try {
          const draft = JSON.parse(draftJson)
          const draftData = draft.data
          
          // Only show drafts that have meaningful content (at least a title or some actual data)
          const hasTitle = draftData?.basicInfo?.title && draftData.basicInfo.title.trim() !== ""
          const hasContent = draftData?.lessons?.length > 0 || draftData?.basicInfo?.description || draftData?.basicInfo?.requirements
          
          if (draftData && draftData.basicInfo && (hasTitle || hasContent)) {
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
            
            // Calculate total duration from lessons
            const lessons = Array.isArray(draftData.lessons) ? draftData.lessons : []
            const totalDurationMinutes = lessons.reduce((total: number, lesson: any) => {
              return total + (lesson.estimatedDuration || 0)
            }, 0)
            const totalHours = Math.round((totalDurationMinutes / 60) * 10) / 10 // Round to 1 decimal place
            
            // Get price from settings.enrollment or basicInfo.price
            const enrollmentMode = draftData.settings?.enrollment?.enrollmentMode
            const enrollmentPrice = draftData.settings?.enrollment?.price
            const basicPrice = parseFloat(draftData.basicInfo.price) || 0

            let finalPrice = 0
            if (enrollmentMode === "buy" && enrollmentPrice) {
              finalPrice = enrollmentPrice
            } else if (enrollmentMode === "buy" && basicPrice) {
              finalPrice = basicPrice
            } else if (basicPrice) {
              finalPrice = basicPrice
            }
            
            // Ensure thumbnail is valid - use placeholder if empty or invalid
            const thumbnail = draftData.basicInfo.thumbnail
            const validThumbnail = thumbnail && thumbnail.trim() !== "" && thumbnail !== "/placeholder.svg"
              ? thumbnail
              : "/placeholder.svg"
            
            // Extract courseId from key (e.g., "course-draft-123" -> 123, "course-draft-new" -> -1)
            const courseIdFromKey = draftKey.replace("course-draft-", "")
            const draftId = courseIdFromKey === "new" ? -1 : parseInt(courseIdFromKey) || -1
            // Store the actual courseId from the draft data or key for matching
            const actualCourseId = draft.courseId || (courseIdFromKey === "new" ? null : parseInt(courseIdFromKey))
            
            drafts.push({
              id: draftId, // Use negative ID for "new" drafts, actual ID for saved drafts
              title: draftData.basicInfo.title || "Untitled Course",
              description: descriptionText || "No description",
              image: validThumbnail,
              lessons: lessons,
              price: finalPrice,
              totalDurationMinutes: totalDurationMinutes,
              totalHours: totalHours,
              settings: {
                isPublished: false, // Drafts are never published
                ...(draftData.settings || {}),
              },
              // Store the actual courseId for duplicate detection
              _localStorageCourseId: actualCourseId,
            })
          }
        } catch (e) {
          console.error("Error parsing draft:", e)
        }
      })
      
      return drafts
    } catch (err) {
      console.error("Error loading drafts:", err)
      return []
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    const drafts = loadDrafts()
    setDraftCourses(drafts)
  }, [mounted, loadDrafts])

  // Process courses data from React Query
  const courses = useMemo(() => {
    if (!coursesData?.courses) return []
    
    // Map API response to match UI expectations
    return coursesData.courses.map((course: any) => {
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

      // Calculate duration from lessons if not already provided
      const lessons = Array.isArray(course.lessons) ? course.lessons : []
      const totalDurationMinutes = course.totalDurationMinutes !== undefined 
        ? course.totalDurationMinutes 
        : lessons.reduce((total: number, lesson: any) => {
            return total + (lesson.estimated_duration || lesson.estimatedDuration || 0)
          }, 0)
      const totalHours = course.totalHours !== undefined 
        ? course.totalHours 
        : Math.round((totalDurationMinutes / 60) * 10) / 10

      return {
        id: course.id,
        title: course.title || "",
        description: course.description || "",
        image: course.image || course.thumbnail || "/placeholder.svg",
        lessons: lessons,
        price: course.price || 0,
        totalDurationMinutes: totalDurationMinutes,
        totalHours: totalHours,
        settings: settings || { isPublished: course.is_published || false },
      }
    })
  }, [coursesData])

  // Clean up orphaned localStorage entries (drafts with positive IDs that don't exist in Supabase)
  // This runs after courses are loaded
  useEffect(() => {
    if (!mounted || courses.length === 0) return
    
    const allCourseIds = new Set(courses.map(c => c.id))
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("course-draft-")) {
        const courseIdFromKey = key.replace("course-draft-", "")
        if (courseIdFromKey !== "new") {
          const courseId = parseInt(courseIdFromKey)
          if (!isNaN(courseId) && courseId > 0 && !allCourseIds.has(courseId)) {
            // This is an orphaned draft - remove it
            keysToRemove.push(key)
          }
        }
      }
    }
    
    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => localStorage.removeItem(key))
      // Reload drafts after cleanup
      setDraftCourses(loadDrafts())
    }
  }, [mounted, courses, loadDrafts])

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


  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  // Show cached data instantly even if isPending is true
  const hasCachedData = !!coursesData?.courses && coursesData.courses.length > 0
  const hasAnyData = hasCachedData || draftCourses.length > 0
  const showSkeleton = (!mounted || authLoading || !user || (userType !== "admin" && userType !== "instructor")) && !hasAnyData

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

      // Invalidate courses cache to trigger refetch
      invalidateCourses()
    } catch (err: any) {
      console.error("Error deleting course:", err)
      toast.error(err.message || "Failed to delete course")
    } finally {
      setDeleting(false)
    }
  }

  // Separate courses into published and drafts
  // Drafts from Supabase have is_published = false
  const supabaseDrafts = courses.filter(course => !course.settings?.isPublished)
  const publishedCourses = courses.filter(course => course.settings?.isPublished)
  
  // Filter localStorage drafts:
  // 1. Only show drafts with negative IDs (true "new" drafts that haven't been saved to Supabase)
  // 2. Exclude any localStorage drafts that have a corresponding Supabase entry (by courseId)
  // 3. Clean up localStorage entries that exist in Supabase
  const localStorageDrafts = draftCourses.filter(localDraft => {
    // Get the actual courseId from localStorage metadata
    const localCourseId = (localDraft as any)._localStorageCourseId
    
    // If this localStorage draft has a real courseId, check if it exists in Supabase
    if (localCourseId && localCourseId !== "new" && typeof localCourseId === "number" && localCourseId > 0) {
      // This is a draft with a real courseId - check if it exists in Supabase
      const existsInSupabase = supabaseDrafts.some(supabaseDraft => supabaseDraft.id === localCourseId) ||
                                publishedCourses.some(publishedCourse => publishedCourse.id === localCourseId)
      if (existsInSupabase) {
        // Remove from localStorage since it exists in Supabase
        const storageKey = `course-draft-${localCourseId}`
        localStorage.removeItem(storageKey)
        return false
      }
    }
    
    // Also check by ID if the draft has a positive ID
    if (localDraft.id > 0) {
      const existsInSupabase = supabaseDrafts.some(supabaseDraft => supabaseDraft.id === localDraft.id) ||
                                publishedCourses.some(publishedCourse => publishedCourse.id === localDraft.id)
      if (existsInSupabase) {
        // Remove from localStorage since it exists in Supabase
        const storageKey = `course-draft-${localDraft.id}`
        localStorage.removeItem(storageKey)
        return false
      }
      // Don't show localStorage drafts with positive IDs - they should be in Supabase
      // If they're not in Supabase, they're orphaned and should be cleaned up
      return false
    }
    
    // Show only "new" drafts (negative IDs) that don't have a matching Supabase entry by title
    // (unless the title is "Untitled Course" which might match multiple drafts)
    if (localDraft.id < 0) {
      return !supabaseDrafts.some(supabaseDraft => 
        localDraft.title === supabaseDraft.title && 
        localDraft.title !== "Untitled Course"
      )
    }
    
    // Don't show any other drafts
    return false
  })
  
  // Combine all courses: published first, then Supabase drafts, then localStorage drafts
  // Remove duplicates (if a course exists in both Supabase and localStorage, prefer Supabase version)
  const allCourses = [
    ...publishedCourses,
    ...supabaseDrafts,
    ...localStorageDrafts
  ]
  
  // Don't show empty state if we're still loading or have cached data
  const shouldShowEmptyState = mounted && !coursesPending && !hasCachedData && allCourses.length === 0
  
  const filteredCourses = allCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase())
    const isDraft = course.id < 0 || !course.settings?.isPublished // Draft courses have negative IDs or is_published = false
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "published" && course.settings?.isPublished && course.id > 0) || 
      (statusFilter === "draft" && (!course.settings?.isPublished || course.id < 0))
    const enrollmentPrice = course.settings?.enrollment?.price || course.price || 0
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && enrollmentPrice === 0) ||
      (priceFilter === "paid" && enrollmentPrice > 0)
    return matchesSearch && matchesStatus && matchesPrice
  })

  const renderCourseCard = (course: Course) => {
    // Draft courses: negative IDs (localStorage) or is_published = false (Supabase)
    const isDraft = course.id < 0 || !course.settings?.isPublished
    
    return (
    <Card key={course.id} className="flex flex-col h-full">
      <CardHeader className="p-4 sm:p-6">
        <div className="aspect-video relative rounded-md overflow-hidden mb-3 sm:mb-4">
          <SafeImage
            src={course.image && course.image.trim() !== "" ? course.image : "/placeholder.svg"}
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
            <span>{Array.isArray(course.lessons) ? course.lessons.length : 0} lessons</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>
              {(() => {
                // Use calculated totalHours if available, otherwise calculate from lessons
                if (course.totalHours !== undefined && course.totalHours > 0) {
                  return `${course.totalHours} ${course.totalHours === 1 ? 'hour' : 'hours'}`
                }
                // Calculate from lessons if available
                const lessons = Array.isArray(course.lessons) ? course.lessons : []
                const totalMinutes = lessons.reduce((total: number, lesson: any) => {
                  return total + (lesson.estimatedDuration || 0)
                }, 0)
                if (totalMinutes > 0) {
                  const hours = Math.round((totalMinutes / 60) * 10) / 10
                  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
                }
                // Fallback for courses without duration info - show 0 hours
                return "0 hours"
              })()}
            </span>
          </div>
          <div className="flex items-center">
            <Banknote className="w-4 h-4 mr-1" />
            <span>
              {(() => {
                const enrollmentMode = course.settings?.enrollment?.enrollmentMode
                const price = course.settings?.enrollment?.price || course.price

                if (enrollmentMode === "buy" && price) {
                  return formatCurrency(price, defaultCurrency)
                } else if (enrollmentMode === "free") {
                  return "Free"
                } else if (price) {
                  return formatCurrency(price, defaultCurrency)
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
        <Link href={`/admin/courses/preview/${createCourseSlug(course.title, course.id)}`} className="flex-1" prefetch={true}>
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
        <Link href={isDraft && course.id < 0 ? "/admin/courses/new" : `/admin/courses/new?edit=${course.id}`} className="flex-1" prefetch={true}>
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
        {isDraft && course.id > 0 && (
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
        {isDraft && course.id < 0 && (
          <Button
            variant="destructive"
            className="flex items-center justify-center flex-1 h-8 text-xs"
            size="sm"
            onClick={() => {
              // Remove all "new" drafts from localStorage
              localStorage.removeItem("course-draft-new")
              // Also check for any other localStorage drafts that might match
              const keysToRemove: string[] = []
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith("course-draft-")) {
                  const courseIdFromKey = key.replace("course-draft-", "")
                  if (courseIdFromKey === "new") {
                    keysToRemove.push(key)
                  } else {
                    // Check if this draft matches the one we're deleting
                    try {
                      const draftJson = localStorage.getItem(key)
                      if (draftJson) {
                        const draft = JSON.parse(draftJson)
                        const draftData = draft.data
                        if (draftData?.basicInfo?.title === course.title) {
                          keysToRemove.push(key)
                        }
                      }
                    } catch (e) {
                      // Ignore parse errors
                    }
                  }
                }
              }
              keysToRemove.forEach(key => localStorage.removeItem(key))
              // Refresh the drafts list
              const updatedDrafts = loadDrafts()
              setDraftCourses(updatedDrafts)
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
      {showSkeleton ? (
        <AdminCoursesSkeleton />
      ) : coursesError && !hasAnyData ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error loading courses</h3>
          <p className="text-sm text-muted-foreground mb-4">{coursesError.message || "Failed to load courses"}</p>
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

      {shouldShowEmptyState && filteredCourses.length === 0 ? (
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
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4 lg:gap-5">
          {filteredCourses.map(renderCourseCard)}
        </div>
      ) : null}

      <AlertDialog 
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          // Prevent closing dialog while deleting
          if (!deleting) {
            setDeleteDialogOpen(open)
          }
        }}
      >
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </span>
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
