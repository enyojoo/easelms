"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { extractIdFromSlug, createCourseSlug } from "@/lib/slug"
import SafeImage from "@/components/SafeImage"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlayCircle, FileText, Award, Clock, Globe, Link as LinkIcon, Users, BrainCircuit, ArrowLeft, Edit } from "lucide-react"
import VideoModal from "@/components/VideoModal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import InstructorCard from "@/components/InstructorCard"
import CourseDetailSkeleton from "@/components/CourseDetailSkeleton"
import { useClientAuthState } from "@/utils/client-auth"
import { useSettings } from "@/lib/react-query/hooks"
import { formatCurrency } from "@/lib/utils/currency"
import { toast } from "sonner"
import ReadMore from "@/components/ReadMore"

interface Course {
  id: number
  title: string
  description: string
  thumbnail?: string
  image?: string
  preview_video?: string
  who_is_this_for?: string
  whoIsThisFor?: string
  requirements?: string
  price?: number
  totalHours?: number
  totalDurationMinutes?: number
  enrolledStudents?: number
  instructors?: Array<{
    id: string
    name: string
    image?: string | null
    bio?: string | null
  }>
  settings?: {
    enrollment?: {
      enrollmentMode?: "open" | "free" | "buy" | "closed"
      price?: number
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
  prerequisites?: Array<{
    id: number
    title: string
    image?: string
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
    url?: string
    html?: string
    text?: string
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
  const { data: settingsData } = useSettings()
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Get platform default currency
  const defaultCurrency = settingsData?.platformSettings?.default_currency || "USD"

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
            const errorMessage = "Course not found"
            setError(errorMessage)
            toast.error(errorMessage)
            setLoading(false)
            return
          }
          throw new Error(`Failed to fetch course: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setCourse(data.course)
      } catch (err: any) {
        console.error("Error fetching course:", err)
        const errorMessage = err.message || "Failed to load course"
        setError(errorMessage)
        toast.error(errorMessage)
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
          <Button variant="outline" asChild>
            <Link href="/admin/courses" prefetch={true}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Get enrollment mode and pricing
  const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
  const coursePrice = course.settings?.enrollment?.price || course.price || 0

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
          price: formatCurrency(coursePrice, defaultCurrency),
          buttonText: "Buy",
          access: "Full lifetime access",
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
    <div className="pt-4 md:pt-8 pb-[30px] md:pb-8 px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-2 mb-4 md:mb-6 flex-wrap">
        <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
          <Link href="/admin/courses" prefetch={true}>
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary break-words flex-1 min-w-0">{course.title}</h1>
        <Button asChild className="flex items-center flex-shrink-0">
          <Link href={`/admin/courses/new?edit=${course.id}`} prefetch={true}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Course
          </Link>
        </Button>
      </div>

      {/* Video Preview Section - Show on mobile/tablet, hide on large screens */}
      <div className="mb-4 md:mb-6 lg:hidden">
        <Card className="border-primary/20">
          <CardContent className="p-4 md:p-6">
            <div
              className={`relative aspect-video mb-4 rounded-lg overflow-hidden ${videoUrl ? "cursor-pointer group" : ""}`}
              onClick={videoUrl ? () => setIsVideoModalOpen(true) : undefined}
            >
              <SafeImage
                src={course.image || "/placeholder.svg?height=400&width=600"}
                alt={course.title}
                fill
                className="object-cover"
                priority={true}
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
              </div>
            </div>
            <Button 
              className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90 h-11 md:h-10"
              onClick={() => router.push(`/admin/courses/${createCourseSlug(course.title, course.id)}/learn`)}
            >
              View Course
            </Button>
            {enrollmentMode !== "free" && (
              <p className="text-left lg:text-center text-xs text-muted-foreground mb-4">30-Day Money-Back Guarantee</p>
            )}
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
              {course.settings?.certificate?.certificateEnabled && (() => {
                // Get certificate type from settings, ensuring it's a string and trimmed
                const certType = course.settings?.certificate?.certificateType 
                  ? String(course.settings.certificate.certificateType).trim().toLowerCase()
                  : "completion"
                const certTitle = course.settings?.certificate?.certificateTitle
                let displayText = "Certificate of Completion"
                
                // If custom title is provided and not empty, use it
                if (certTitle && certTitle.trim() !== "") {
                  displayText = certTitle.trim()
                } else {
                  // Map certificate type to display text
                  switch (certType) {
                    case "participation":
                      displayText = "Certificate of Participation"
                      break
                    case "achievement":
                      displayText = "Certificate of Achievement"
                      break
                    case "completion":
                    default:
                      displayText = "Certificate of Completion"
                      break
                  }
                }
                
                return (
                  <div className="flex items-center">
                    <Award className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                    <span className="text-xs md:text-sm">{displayText}</span>
                  </div>
                )
              })()}
              <div className="flex items-center">
                <Users className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm">{course?.enrolledStudents || 0} learners enrolled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          {/* Course Overview Section */}
          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Course Overview</h2>
              <ReadMore text={course.description || ""} maxLength={1000} className="mb-4 leading-relaxed" />
              <div className="flex flex-wrap items-center gap-2 md:gap-4 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <span>{lessons.length} lessons</span>
                  <span>•</span>
                  <span>{totalHours} hours</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Course Content</h2>
              <Accordion type="single" collapsible className="w-full">
                {(course.lessons || []).map((lesson, index) => {
                  const isVideoLesson = (lesson as any).url
                  const isTextLesson = (lesson as any).html || (lesson as any).text
                  const LessonIcon = isVideoLesson ? PlayCircle : isTextLesson ? FileText : PlayCircle
                  
                  return (
                    <AccordionItem value={`item-${index}`} key={lesson.id || index} className="border-b">
                      <AccordionTrigger className="py-3 md:py-4">
                        <div className="flex items-start justify-between w-full text-left">
                          <div className="flex items-start flex-1 min-w-0 pr-2">
                            <LessonIcon className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                            <span className="font-medium text-sm md:text-base text-left break-words">{lesson.title}</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 md:pt-3 md:pb-4">
                        <div className="space-y-2 md:space-y-3">
                          {/* Quiz section */}
                          {lesson.quiz_questions && lesson.quiz_questions.length > 0 && (
                            <div className="flex items-center justify-between py-2 pl-6 md:pl-7">
                              <div className="flex items-center min-w-0 flex-1">
                                <BrainCircuit className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                                <span className="text-xs md:text-sm truncate">Quiz</span>
                              </div>
                              <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0 ml-2">
                                {lesson.quiz_questions.length} questions
                              </span>
                            </div>
                          )}

                          {/* Resources */}
                          {lesson.resources?.map((resource, rIndex) => (
                            <div key={rIndex} className="flex items-center justify-between py-2 pl-6 md:pl-7">
                              <div className="flex items-center min-w-0 flex-1">
                                {resource.type === "document" ? (
                                  <FileText className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                                ) : (
                                  <LinkIcon className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                                )}
                                <span className="text-xs md:text-sm truncate">{resource.title}</span>
                              </div>
                              <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0 ml-2">
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

          {(course.who_is_this_for || course.whoIsThisFor) && (
            <Card className="mb-4 md:mb-6">
              <CardContent className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Who this course is for:</h2>
                <ReadMore text={course.who_is_this_for || course.whoIsThisFor || ""} maxLength={1000} className="leading-relaxed whitespace-pre-line" />
              </CardContent>
            </Card>
          )}

          {course.requirements && (
            <Card className="mb-4 md:mb-6">
              <CardContent className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Requirements</h2>
                {course.requirements ? (
                  <ReadMore text={course.requirements} maxLength={1000} className="leading-relaxed whitespace-pre-line" />
                ) : (
                  <ul className="list-disc pl-4 md:pl-5 text-sm md:text-base text-muted-foreground space-y-2">
                    <li>Open heart and willingness to learn</li>
                    <li>Desire for personal and spiritual growth</li>
                    <li>Commitment to complete the course materials</li>
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Prerequisites Section */}
          {course?.prerequisites && course.prerequisites.length > 0 && (
            <Card className="mb-4 md:mb-6">
              <CardContent className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Prerequisites</h2>
                <p className="text-sm md:text-base text-muted-foreground mb-4">
                  Complete these courses before enrolling in this course:
                </p>
                <div className="space-y-3">
                  {course.prerequisites.map((prereq: any) => (
                    <div
                      key={prereq.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
                        <SafeImage
                          src={prereq.image || "/placeholder.svg"}
                          alt={prereq.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm md:text-base truncate">{prereq.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
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

        {/* Video Preview Section - Show only on large screens */}
        <div className="hidden lg:block lg:col-span-1">
          <Card className="sticky top-24 border-primary/20 h-fit">
            <CardContent className="p-6">
              <div
                className={`relative aspect-video mb-4 rounded-lg overflow-hidden ${videoUrl ? "cursor-pointer group" : ""}`}
                onClick={videoUrl ? () => setIsVideoModalOpen(true) : undefined}
              >
                <SafeImage
                  src={course.image || "/placeholder.svg"}
                  alt={course.title}
                  fill
                  className="object-cover"
                  priority={true}
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
                </div>
              </div>
              <Button 
                className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                onClick={() => router.push(`/admin/courses/${createCourseSlug(course.title, course.id)}/learn`)}
              >
                View Course
              </Button>
              {enrollmentMode !== "free" && (
                <p className="text-left lg:text-center text-xs text-muted-foreground mb-4">30-Day Money-Back Guarantee</p>
              )}
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
                {course.settings?.certificate?.certificateEnabled && (() => {
                  // Get certificate type from settings, ensuring it's a string and trimmed
                  const certType = course.settings?.certificate?.certificateType 
                    ? String(course.settings.certificate.certificateType).trim().toLowerCase()
                    : "completion"
                  const certTitle = course.settings?.certificate?.certificateTitle
                  let displayText = "Certificate of Completion"
                  
                  // If custom title is provided and not empty, use it
                  if (certTitle && certTitle.trim() !== "") {
                    displayText = certTitle.trim()
                  } else {
                    // Map certificate type to display text
                    switch (certType) {
                      case "participation":
                        displayText = "Certificate of Participation"
                        break
                      case "achievement":
                        displayText = "Certificate of Achievement"
                        break
                      case "completion":
                      default:
                        displayText = "Certificate of Completion"
                        break
                    }
                  }
                  
                  return (
                    <div className="flex items-center">
                      <Award className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                      <span className="text-xs md:text-sm">{displayText}</span>
                    </div>
                  )
                })()}
                <div className="flex items-center">
                  <Users className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                  <span className="text-xs md:text-sm">{course?.enrolledStudents || 0} learners enrolled</span>
                </div>
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
