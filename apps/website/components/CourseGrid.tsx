"use client"

import { useState, useEffect } from "react"
import CourseCard from "@/components/CourseCard"
import { Module } from "@/lib/types/course"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, BookOpen } from "lucide-react"

interface CourseGridProps {
  title?: string
  subtitle?: string
  showSearch?: boolean
  showFilters?: boolean
  limit?: number
  className?: string
}

export default function CourseGrid({
  title = "Available Courses",
  subtitle = "Explore our comprehensive course catalog",
  showSearch = true,
  showFilters = true,
  limit,
  className = "",
}: CourseGridProps) {
  const [courses, setCourses] = useState<Module[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("title")

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/courses")
        if (!response.ok) {
          throw new Error("Failed to fetch courses")
        }
        const data = await response.json()
        setCourses(data.courses || [])
      } catch (err: any) {
        setError(err.message || "Failed to load courses")
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  // Filter and sort courses
  useEffect(() => {
    let filtered = courses.filter((course) =>
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Apply sorting
    switch (sortBy) {
      case "title":
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "price-low":
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0))
        break
      case "price-high":
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0))
        break
      case "students":
        filtered.sort((a, b) => (b.enrolledStudents || 0) - (a.enrolledStudents || 0))
        break
      case "duration":
        filtered.sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0))
        break
      default:
        break
    }

    // Apply limit if specified
    if (limit) {
      filtered = filtered.slice(0, limit)
    }

    setFilteredCourses(filtered)
  }, [courses, searchTerm, sortBy, limit])

  if (loading) {
    return (
      <section className={`py-12 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-muted animate-pulse rounded-lg h-96"></div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={`py-12 ${className}`}>
        <div className="container mx-auto px-4">
          <div className="text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to load courses</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {showSearch && (
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              {showFilters && (
                <div className="w-full sm:w-48">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Title (A-Z)</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="students">Most Popular</SelectItem>
                      <SelectItem value="duration">Longest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? "No courses match your search. Try adjusting your search terms."
                : "There are currently no published courses available. Check back later for new courses."}
            </p>
          </div>
        )}

        {/* Show More Button */}
        {limit && courses.length > limit && filteredCourses.length >= limit && (
          <div className="text-center mt-8">
            <Button asChild variant="outline">
              <a href="/courses">View All Courses</a>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}