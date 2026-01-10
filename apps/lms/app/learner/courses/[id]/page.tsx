"use client"

import { useState, useEffect } from "react"
import { notFound, useParams } from "next/navigation"
import { extractIdFromSlug, createCourseSlug } from "@/lib/slug"
import SafeImage from "@/components/SafeImage"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, FileText, Award, Clock, Globe, Link as LinkIcon, Users, BrainCircuit, ArrowLeft, CheckCircle2, XCircle } from "lucide-react"
import VideoModal from "@/components/VideoModal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useRouter } from "next/navigation"
import InstructorCard from "@/components/InstructorCard"
import ReadMore from "@/components/ReadMore"
import { enrollInCourse, handleCoursePayment } from "@/utils/enrollment"
import { useClientAuthState } from "@/utils/client-auth"
import { useCourse, useEnrollments, useEnrollCourse, useRealtimeCourseEnrollments } from "@/lib/react-query/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
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
import Link from "next/link"

interface Course {
  id: number
  title: string
  description: string
  image: string
  preview_video?: string
  totalHours?: number
  totalDurationMinutes?: number
  settings?: {
    enrollment?: {
      enrollmentMode?: "open" | "free" | "buy" | "recurring" | "closed"
      price?: number
      recurringPrice?: number
    }
    certificate?: any
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
    settings?: any
    resources?: Array<{
      title: string
      type: string
    }>
    quiz_questions?: Array<any>
  }>
  enrolledStudents?: number
  whoIsThisFor?: string
  requirements?: string
  created_by?: string
  creator?: {
    id: string
    name: string
    email: string
    profile_image?: string
    bio?: string
    user_type?: string
  }
}

export default function CoursePage() {
  const params = useParams()
  const slugOrId = params.id as string
  const id = extractIdFromSlug(slugOrId) // Extract actual ID from slug if present
  const router = useRouter()
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [prerequisitesError, setPrerequisitesError] = useState<{
    show: boolean
    missingPrerequisites: Array<{ id: number; title: string; status: string }>
  }>({ show: false, missingPrerequisites: [] })

  // Get user auth state
  const { user, loading: authLoading } = useClientAuthState()
  
  // Use React Query hooks for data fetching
  const { data: courseData, isPending: coursePending, error: courseError } = useCourse(id)
  const { data: enrollmentsData } = useEnrollments()
  const enrollCourseMutation = useEnrollCourse()
  const queryClient = useQueryClient()
  
  // Set up real-time subscription for course enrollment count
  useRealtimeCourseEnrollments(id)
  
  const course = courseData?.course

  // Check enrollment status from enrollments data
  useEffect(() => {
    if (!id || !enrollmentsData?.enrollments) return

    const courseId = parseInt(id)
    const enrollment = enrollmentsData.enrollments.find((e: any) => e.course_id === courseId)
    
    if (enrollment) {
      setIsEnrolled(true)
      setIsCompleted(enrollment.status === "completed")
    } else {
      setIsEnrolled(false)
      setIsCompleted(false)
    }
  }, [id, enrollmentsData])

  // Get enrollment count from course data (total enrollments for the course)
  const enrollmentCount = course?.enrolledStudents || 0

  // Show error only if no cached data exists
  if (courseError && !course) {
    const is404 = courseError instanceof Error && courseError.message.includes("404")
    if (is404) {
      notFound()
    }
    return (
      <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <p className="text-destructive">{courseError instanceof Error ? courseError.message : "Course not found"}</p>
          <Button asChild>
            <Link href="/learner/courses" prefetch={true}>Back to Courses</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Render with cached data immediately - don't wait for pending state
  if (!course && !authLoading) {
    return null // Will show on refetch
  }

  // Additional safety check - ensure course exists before accessing properties
  if (!course) {
    return null
  }

  // Calculate total resources from lessons
  const totalResources = (course?.lessons || []).reduce((total, lesson) => {
    return total + (lesson?.resources?.length || 0)
  }, 0)

  const videoUrl = course?.preview_video || ""

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

  // Get actual enrollment mode from course settings
  const enrollmentMode = course?.settings?.enrollment?.enrollmentMode || "free"
  const coursePrice = course?.settings?.enrollment?.price || 0
  const recurringPrice = course?.settings?.enrollment?.recurringPrice

  const getAccessDetails = () => {
    if (isCompleted) {
      return {
        price: enrollmentMode === "free" ? "Free" : `$${enrollmentMode === "recurring" ? (recurringPrice || coursePrice) : coursePrice}`,
        buttonText: "View Summary",
        access: enrollmentMode === "recurring" ? "Access while subscribed" : "Full access for 3 months",
      }
    }

    if (isEnrolled) {
      return {
        price: enrollmentMode === "free" ? "Free" : `$${enrollmentMode === "recurring" ? (recurringPrice || coursePrice) : coursePrice}`,
        buttonText: "Continue",
        access: enrollmentMode === "recurring" ? "Access while subscribed" : "Full access for 3 months",
      }
    }
    
    switch (enrollmentMode) {
      case "free":
        return {
          price: "Free",
          buttonText: "Enroll",
          access: "Full access for 3 months",
        }
      case "buy":
        return {
          price: `$${coursePrice}`,
          buttonText: "Buy",
          access: "Full access for 3 months",
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
          buttonText: "Enroll",
          access: "Full access for 3 months",
        }
    }
  }

  const { price, buttonText, access } = getAccessDetails()

  const handleEnrollOrStart = async () => {
    if (!id || isNaN(Number.parseInt(id))) {
      toast.error("Invalid course ID")
      return
    }

    const courseId = Number.parseInt(id)
    
    if (isCompleted) {
      // Course is completed, go to summary page
      router.push(`/learner/courses/${createCourseSlug(course?.title || "", courseId)}/learn/summary`)
      return
    }

    if (isEnrolled) {
      // Already enrolled, go to learn page
      router.push(`/learner/courses/${createCourseSlug(course?.title || "", courseId)}/learn`)
      return
    }

    if (!user) return

    setIsEnrolling(true)
    try {
      if (enrollmentMode === "free") {
        // Enroll directly for free courses using React Query mutation
        try {
          await enrollCourseMutation.mutateAsync(courseId)
          toast.success(`Successfully enrolled in ${course?.title || "course"}`)
          // Refetch enrollments to ensure cache is updated before redirect
          await queryClient.refetchQueries({ queryKey: ["enrollments"] })
          // Redirect to learn page after enrollment and cache update
          router.push(`/learner/courses/${createCourseSlug(course?.title || "", courseId)}/learn`)
        } catch (error: any) {
          console.error("Error enrolling in course:", error)
          // Check if error is due to prerequisites
          if (error?.errorData?.error === "Prerequisites not met" && error?.errorData?.missingPrerequisites) {
            setPrerequisitesError({
              show: true,
              missingPrerequisites: error.errorData.missingPrerequisites,
            })
            setIsEnrolling(false)
            return
          }
          // Check if already enrolled
          if (error?.errorData?.error === "User is already enrolled in this course") {
            toast.error("You are already enrolled in this course")
          } else {
            toast.error(error?.errorData?.error || error?.message || "Failed to enroll in course")
          }
          setIsEnrolling(false)
        }
      } else {
        // Handle payment/subscription for paid courses
        // Check prerequisites before payment
        const prereqCheckResponse = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: courseId }),
        })

        if (!prereqCheckResponse.ok) {
          const errorData = await prereqCheckResponse.json().catch(() => ({}))
          if (errorData.error === "Prerequisites not met" && errorData.missingPrerequisites) {
            setPrerequisitesError({
              show: true,
              missingPrerequisites: errorData.missingPrerequisites,
            })
            setIsEnrolling(false)
            return
          }
          // Show error toast for other enrollment errors
          if (errorData.error === "User is already enrolled in this course") {
            toast.error("You are already enrolled in this course")
          } else {
            toast.error(errorData.error || "Failed to enroll in course")
          }
          setIsEnrolling(false)
          return
        }

        const success = await handleCoursePayment(
          courseId,
          enrollmentMode,
          coursePrice,
          recurringPrice,
          course?.title || "",
          user
        )
        if (success) {
          toast.success(`Successfully enrolled in ${course?.title || "course"}`)
          // Refetch enrollments after payment (payment webhook should create enrollment)
          await queryClient.refetchQueries({ queryKey: ["enrollments"] })
          // Redirect to learn page after successful payment
          router.push(`/learner/courses/${createCourseSlug(course?.title || "", courseId)}/learn`)
        } else {
          toast.error("Payment failed. Please try again.")
          setIsEnrolling(false)
        }
      }
    } catch (error) {
      console.error("Error enrolling in course:", error)
      setIsEnrolling(false)
    }
  }

  const getCourseBadge = () => {
    if (isCompleted) {
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          Completed
        </Badge>
      )
    }

    if (isEnrolled) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Enrolled
        </Badge>
      )
    }

    switch (enrollmentMode) {
      case "free":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Free
          </Badge>
        )
      case "buy":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Paid
          </Badge>
        )
      case "recurring":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Subscription
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
      <div className="flex items-center gap-2 mb-4 md:mb-6 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex-shrink-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
        </Button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary break-words flex-1 min-w-0">{course?.title || ""}</h1>
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
                src={course?.image || "/placeholder.svg?height=400&width=600"}
                alt={course?.title || "Course"}
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
                {enrollmentMode === "recurring" && !isEnrolled && <span className="text-xs md:text-sm text-muted-foreground">/month</span>}
              </div>
              <div className="flex-shrink-0">{getCourseBadge()}</div>
            </div>
            <Button
              className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90 h-11 md:h-10"
              onClick={handleEnrollOrStart}
              disabled={isEnrolling}
            >
              {isEnrolling ? "Processing..." : buttonText}
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
              <ReadMore text={course?.description || ""} maxLength={1000} className="mb-4 leading-relaxed" />
              <div className="flex flex-wrap items-center gap-2 md:gap-4 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <span>{course.lessons?.length || 0} lessons</span>
                  <span>•</span>
                  <span>{course.totalHours || 0} hours</span>
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

          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Who this course is for:</h2>
              {course?.whoIsThisFor ? (
                <ReadMore text={course.whoIsThisFor} maxLength={1000} className="leading-relaxed whitespace-pre-line" />
              ) : (
                <ul className="list-disc pl-4 md:pl-5 text-sm md:text-base text-muted-foreground space-y-2">
                  <li>Individuals seeking personal and spiritual growth</li>
                  <li>Those looking to discover their purpose and calling</li>
                  <li>Anyone desiring to deepen their relationship with God</li>
                  <li>People ready to transform their lives and impact others</li>
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Requirements</h2>
              {course?.requirements ? (
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

          {/* Prerequisites Section */}
          {course?.prerequisites && course.prerequisites.length > 0 && (
            <Card className="mb-4 md:mb-6">
              <CardContent className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Prerequisites</h2>
                <p className="text-sm md:text-base text-muted-foreground mb-4">
                  Complete these courses before enrolling in this course:
                </p>
                <div className="space-y-3">
                  {course.prerequisites.map((prereq: any) => {
                    const enrollment = enrollmentsData?.enrollments?.find(
                      (e: any) => e.course_id === prereq.id
                    )
                    const isCompleted = enrollment?.status === "completed" || enrollment?.completed_at !== null
                    const isInProgress = enrollment && !isCompleted && enrollment.progress > 0
                    const status = isCompleted ? "completed" : isInProgress ? "in_progress" : "not_started"

                    return (
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
                          <div className="flex items-center gap-2 mt-1">
                            {status === "completed" && (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-xs text-green-600">Completed</span>
                              </>
                            )}
                            {status === "in_progress" && (
                              <>
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-xs text-blue-600">In Progress</span>
                              </>
                            )}
                            {status === "not_started" && (
                              <>
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Not Started</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/learner/courses/${createCourseSlug(prereq.title, prereq.id)}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {status === "completed" ? "View Course" : status === "in_progress" ? "Continue" : "Enroll Now"}
                        </Link>
                      </div>
                    )
                  })}
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
                  src={course?.image || "/placeholder.svg"}
                  alt={course?.title || "Course"}
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
              <div className="mt-4 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-primary">{price}</span>
                  {enrollmentMode === "recurring" && !isEnrolled && <span className="text-sm text-muted-foreground">/month</span>}
                </div>
                {getCourseBadge()}
              </div>
              <Button
                className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleEnrollOrStart}
                disabled={isEnrolling}
              >
                {isEnrolling ? "Processing..." : buttonText}
              </Button>
              {enrollmentMode !== "free" && (
                <p className="text-center text-xs text-muted-foreground mb-4">30-Day Money-Back Guarantee</p>
              )}
              <div className="space-y-2 text-muted-foreground">
                {totalResources > 0 && (
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-primary" />
                    <span>{totalResources} resources</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-primary" />
                  <span>{access}</span>
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
                      <Award className="w-5 h-5 mr-2 text-primary" />
                      <span>{displayText}</span>
                    </div>
                  )
                })()}
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  <span>{enrollmentCount} learners enrolled</span>
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
        title={course?.title || ""}
      />

      {/* Prerequisites Error Modal */}
      <AlertDialog open={prerequisitesError.show} onOpenChange={(open) => setPrerequisitesError({ ...prerequisitesError, show: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Prerequisites Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to complete these courses before enrolling in this course:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            {prerequisitesError.missingPrerequisites.map((prereq) => (
              <div key={prereq.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{prereq.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {prereq.status === "in_progress" ? "In Progress" : "Not Started"}
                  </p>
                </div>
                <Link
                  href={`/learner/courses/${createCourseSlug(prereq.title, prereq.id)}`}
                  className="text-sm text-primary hover:underline"
                >
                  {prereq.status === "in_progress" ? "Continue Learning" : "Enroll Now"}
                </Link>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
