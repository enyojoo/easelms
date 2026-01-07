"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { extractIdFromSlug, createCourseSlug } from "@/lib/slug"
import SafeImage from "@/components/SafeImage"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlayCircle, FileText, Award, Clock, Globe, Users } from "lucide-react"
import VideoModal from "@/components/VideoModal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BrainCircuit, Link as LinkIcon } from "lucide-react"
import { ArrowLeft, Edit } from "lucide-react"
import InstructorCard from "@/components/InstructorCard"
import CourseDetailSkeleton from "@/components/CourseDetailSkeleton"
import { useClientAuthState } from "@/utils/client-auth"

interface Course {
  id: number
  title: string
  description: string
  thumbnail?: string
  image?: string
  preview_video?: string
  who_is_this_for?: string
  requirements?: string
  price?: number
  settings?: {
    enrollment?: {
      enrollmentMode?: "open" | "free" | "buy" | "recurring" | "closed"
      price?: number
      recurringPrice?: number
    }
    certificate?: {
      certificateEnabled?: boolean
      certificateType?: string
      certificateTitle?: string
    }
    instructor?: {
      instructorEnabled?: boolean
      instructorIds?: string[]
    }
  }
  instructors?: Array<{
    id: string
    name: string
    image?: string
    bio?: string
  }>
  lessons?: Array<{
    id: number
    title: string
    type?: string
    content?: any
    resources?: Array<{
      title: string
      type: string
      url?: string
    }>
    quiz_questions?: Array<any>
    estimated_duration?: number
  }>
  creator?: {
    id: string
    name: string
    email: string
    profile_image?: string
    bio?: string
    user_type?: string
  }
}

export default function InstructorCoursePreviewPage() {
  const params = useParams()
  const slugOrId = params.id as string
  const id = extractIdFromSlug(slugOrId) // Extract actual ID from slug if present
  const router = useRouter()
  const { user, loading: authLoading, userType } = useClientAuthState()
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && (!user || (userType !== "admin" && userType !== "instructor"))) {
      router.push("/auth/admin/login")
    }
  }, [user, userType, authLoading, router])

  useEffect(() => {
    const fetchCourse = async () => {
      if (!mounted || !id || authLoading || !user || (userType !== "admin" && userType !== "instructor")) return

      try {
        setLoading(true)
        setError(null)

        const fetchUrl = `/api/courses/${id}`
        console.log("Fetching course from URL:", fetchUrl)
        const response = await fetch(fetchUrl)
        if (!response.ok) {
          const errorText = await response.text()
          console.error("API Error Response:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          })
          if (response.status === 404) {
            setError("Course not found")
            setLoading(false)
            return
          }
          throw new Error(`Failed to fetch course: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setCourse(data.course)
      } catch (err: any) {
        console.error("Error fetching course:", err)
        setError(err.message || "Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [id, mounted, authLoading, user, userType, router])

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  const hasData = !!course
  const showSkeleton = (!mounted || authLoading || !user || (userType !== "admin" && userType !== "instructor") || loading) && !hasData

  if (showSkeleton) {
    return <CourseDetailSkeleton />
  }

  if (error || !course) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="text-center py-8">
          <p className="text-destructive mb-4">{error || "Course not found"}</p>
          <Button variant="outline" onClick={() => router.push("/admin/courses")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>
        </div>
      </div>
    )
  }

  // Get enrollment mode and pricing
  const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
  const coursePrice = course.settings?.enrollment?.price || course.price || 0
  const recurringPrice = course.settings?.enrollment?.recurringPrice

  // Get total duration from course data (calculated by API)
  const lessons = course.lessons || []
  const totalHours = course.totalHours || 0
  const totalDurationMinutes = course.totalDurationMinutes || 0

  // Count total resources
  const totalResources = lessons.reduce((total, lesson) => {
    return total + (lesson.resources?.length || 0)
  }, 0)

  const videoUrl = course.preview_video || ""

  const getAccessDetails = () => {
    switch (enrollmentMode) {
      case "free":
        return {
          price: "Free",
          buttonText: "Start",
          access: "Full lifetime access",
        }
      case "buy":
        return {
          price: `$${coursePrice}`,
          buttonText: "Buy",
          access: "Full lifetime access",
        }
      case "recurring":
        return {
          price: `$${recurringPrice || coursePrice}`,
          buttonText: "Subscribe",
          access: "Access while subscribed",
        }
      default:
        return {
          price: "Free",
          buttonText: "Start",
          access: "Full lifetime access",
        }
    }
  }

  const { price, buttonText, access } = getAccessDetails()

  // Instructor information - use assigned instructors if available, otherwise fallback to creator
  const hasInstructors = course?.instructors && course.instructors.length > 0
  const instructorsEnabled = course?.settings?.instructor?.instructorEnabled || hasInstructors
  
  // If instructors are enabled and there are instructors, use them
  // Otherwise, fallback to course creator
  const instructors = hasInstructors && instructorsEnabled
    ? course.instructors.map((inst: any) => ({
        name: inst.name || "Instructor",
        profileImage: inst.image || "/placeholder.svg?height=200&width=200",
        bio: inst.bio || "",
        title: "Course Instructor"
      }))
    : course?.creator ? [{
        name: course.creator.name || "Instructor",
        profileImage: course.creator.profile_image || "/placeholder.svg?height=200&width=200",
        bio: course.creator.bio || "",
        title: course.creator.user_type === "admin" || course.creator.user_type === "instructor" 
          ? "Course Instructor" 
          : "Course Creator"
      }] : [{
        name: "Instructor",
        profileImage: "/placeholder.svg?height=200&width=200",
        bio: "",
        title: "Course Instructor"
      }]

  return (
    <div className="pt-4 md:pt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/courses")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-primary">{course.title}</h1>
        </div>
        <Button onClick={() => router.push(`/admin/courses/new?edit=${course.id}`)} className="flex items-center">
          <Edit className="w-4 h-4 mr-2" />
          Edit Course
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {/* Course Overview Section */}
          <Card className="mb-4">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary">Course Overview</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed whitespace-pre-wrap">{course.description}</p>
              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{lessons.length} lessons</span>
                  <span>•</span>
                  <span>{totalHours} hours</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary">Course Content</h2>
              <Accordion type="single" collapsible className="w-full">
                {lessons.map((lesson, index) => {
                  const quizQuestions = lesson.quiz_questions || []
                  const resources = lesson.resources || []
                  const isVideoLesson = (lesson as any).url || (lesson as any).content?.url
                  const isTextLesson = (lesson as any).html || (lesson as any).text || (lesson as any).content?.html || (lesson as any).content?.text
                  const LessonIcon = isVideoLesson ? PlayCircle : isTextLesson ? FileText : PlayCircle

                  return (
                    <AccordionItem value={`item-${lesson.id || index}`} key={lesson.id || index}>
                      <AccordionTrigger>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <LessonIcon className="w-5 h-5 mr-2 text-primary" />
                            <span className="font-medium">{lesson.title}</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {/* Quiz section */}
                          {quizQuestions.length > 0 && (
                            <div className="flex items-center justify-between py-2 pl-7">
                              <div className="flex items-center">
                                <BrainCircuit className="w-4 h-4 mr-2 text-primary" />
                                <span className="text-sm">Quiz</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{quizQuestions.length} questions</span>
                            </div>
                          )}

                          {/* Resources */}
                          {resources.map((resource, rIndex) => (
                            <div key={rIndex} className="flex items-center justify-between py-2 pl-7">
                              <div className="flex items-center">
                                {resource.type === "document" ? (
                                  <FileText className="w-4 h-4 mr-2 text-primary" />
                                ) : (
                                  <LinkIcon className="w-4 h-4 mr-2 text-primary" />
                                )}
                                <span className="text-sm">{resource.title}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {resource.type === "document" ? "File" : "Link"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </CardContent>
          </Card>

          {course.who_is_this_for && (
            <Card className="mb-4">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-primary">Who this course is for:</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{course.who_is_this_for}</p>
              </CardContent>
            </Card>
          )}

          {course.requirements && (
            <Card className="mb-4">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-primary">Requirements</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{course.requirements}</p>
              </CardContent>
            </Card>
          )}

          {/* Instructor Profile Cards */}
          {instructors && instructors.length > 0 && (
            <div className="space-y-4">
              {instructors.map((instructor: any, index: number) => (
                <InstructorCard
                  key={index}
                  name={instructor.name}
                  image={instructor.profileImage}
                  bio={instructor.bio}
                  title={instructor.title}
                  className="mb-4"
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-primary/20 h-fit">
            <CardContent className="p-6">
              <div
                className="relative aspect-video mb-4 rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setIsVideoModalOpen(true)}
              >
                <SafeImage
                  src={course.thumbnail || course.image || "/placeholder.svg"}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
                {videoUrl && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                    <PlayCircle className="w-16 h-16 text-white opacity-90 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              <div className="mt-4 mb-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xl md:text-2xl font-bold text-primary">{price}</span>
                  {enrollmentMode === "recurring" && <span className="text-xs md:text-sm text-muted-foreground">/month</span>}
                </div>
              </div>
              <Button 
                className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                onClick={() => router.push(`/admin/courses/${createCourseSlug(course.title, course.id)}/learn`)}
              >
                View Course
              </Button>
              <div className="space-y-2 md:space-y-2.5 text-muted-foreground">
                {totalResources > 0 && (
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                    <span className="text-xs md:text-sm">{totalResources} resources</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Globe className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                  <span className="text-xs md:text-sm break-words">{access}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                  <span className="text-xs md:text-sm">{course?.enrolledStudents || 0} learners enrolled</span>
                </div>
                {course.settings?.certificate?.certificateEnabled && (() => {
                  // Only show certificate info if enabled
                  const certType = course.settings?.certificate?.certificateType
                  const certTitle = course.settings?.certificate?.certificateTitle
                  let displayText = ""
                  
                  // Use custom title if provided, otherwise use type-based title
                  if (certTitle && certTitle.trim() !== "") {
                    displayText = certTitle
                  } else if (certType) {
                    // Use the certificate type from database
                    switch (certType.toLowerCase()) {
                      case "participation":
                        displayText = "Certificate of Participation"
                        break
                      case "achievement":
                        displayText = "Certificate of Achievement"
                        break
                      case "completion":
                        displayText = "Certificate of Completion"
                        break
                      default:
                        displayText = "Certificate of Completion"
                        break
                    }
                  } else {
                    // Fallback if no type specified
                    displayText = "Certificate of Completion"
                  }
                  
                  return (
                  <div className="flex items-center">
                    <Award className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                    <span className="text-xs md:text-sm">{displayText}</span>
                  </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={videoUrl}
        title={course.title}
      />
    </div>
  )
}
