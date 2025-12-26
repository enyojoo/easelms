"use client"

import { useState, useEffect } from "react"
import { notFound, useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, FileText, Award, Clock, Globe, Link, Users } from "lucide-react"
import CourseDetailSkeleton from "@/components/CourseDetailSkeleton"
import VideoModal from "@/components/VideoModal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BrainCircuit } from "lucide-react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import InstructorCard from "@/components/InstructorCard"
import { enrollInCourse, handleCoursePayment } from "@/utils/enrollment"
import { getClientAuthState } from "@/utils/client-auth"

interface Course {
  id: number
  title: string
  description: string
  image: string
  settings?: {
    enrollment?: {
      enrollmentMode?: "open" | "free" | "buy" | "recurring" | "closed"
      price?: number
      recurringPrice?: number
    }
    certificate?: any
  }
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
  const id = params.id as string
  const router = useRouter()
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
    const authState = getClientAuthState()
    setUser(authState.user)
  }, [])

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        // Fetch course data
        const courseResponse = await fetch(`/api/courses/${id}`)
        if (!courseResponse.ok) {
          if (courseResponse.status === 404) {
            notFound()
            return
          }
          throw new Error("Failed to fetch course")
        }
        const courseData = await courseResponse.json()
        setCourse(courseData.course)

        // Check enrollment status
        if (user) {
          const enrollmentsResponse = await fetch("/api/enrollments")
          if (enrollmentsResponse.ok) {
            const enrollmentsData = await enrollmentsResponse.json()
            const enrollments = enrollmentsData.enrollments || []
            const enrollment = enrollments.find((e: any) => e.course_id === parseInt(id))
            setIsEnrolled(!!enrollment)
          }
        }
      } catch (err: any) {
        console.error("Error fetching course:", err)
        setError(err.message || "Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [id, user])

  // Show skeleton until mounted and data is loaded
  if (!mounted || loading) {
    return <CourseDetailSkeleton />
  }

  if (error || !course) {
    return (
      <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <p className="text-destructive">{error || "Course not found"}</p>
          <Button onClick={() => router.push("/learner/courses")}>Back to Courses</Button>
        </div>
      </div>
    )
  }

  // Instructor information - use course creator's profile
  const instructor = course.creator ? {
    name: course.creator.name || "Instructor",
    bio: course.creator.bio || "",
    profileImage: course.creator.profile_image || "/placeholder.svg?height=200&width=200",
    title: course.creator.user_type === "admin" || course.creator.user_type === "instructor" 
      ? "Course Instructor" 
      : "Course Creator"
  } : {
    name: "Instructor",
    bio: "",
    profileImage: "/placeholder.svg?height=200&width=200",
    title: "Course Instructor"
  }

  // Get actual enrollment mode from course settings
  const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
  const coursePrice = course.settings?.enrollment?.price || 0
  const recurringPrice = course.settings?.enrollment?.recurringPrice

  const getAccessDetails = () => {
    if (isEnrolled) {
      return {
        price: enrollmentMode === "free" ? "Free" : `$${enrollmentMode === "recurring" ? (recurringPrice || coursePrice) : coursePrice}`,
        buttonText: "Continue",
        access: enrollmentMode === "recurring" ? "Access while subscribed" : "Full lifetime access",
      }
    }
    
    switch (enrollmentMode) {
      case "free":
        return {
          price: "Free",
          buttonText: "Enroll",
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
          buttonText: "Enroll",
          access: "Full lifetime access",
        }
    }
  }

  const { price, buttonText, access } = getAccessDetails()

  const handleEnrollOrStart = async () => {
    if (isEnrolled) {
      // Already enrolled, go to learn page
      router.push(`/learner/courses/${id}/learn`)
      return
    }

    setIsEnrolling(true)
    try {
      if (enrollmentMode === "free") {
        // Enroll directly for free courses
        const success = await enrollInCourse(Number.parseInt(id), user)
        if (success) {
          setIsEnrolled(true)
          // Redirect to learn page
          router.push(`/learner/courses/${id}/learn`)
        }
      } else {
        // Handle payment/subscription for paid courses
        const success = await handleCoursePayment(
          Number.parseInt(id),
          enrollmentMode,
          coursePrice,
          recurringPrice,
          course.title,
          user
        )
        if (success) {
          setIsEnrolled(true)
          // Redirect to learn page after successful payment
          router.push(`/learner/courses/${id}/learn`)
        }
      }
    } catch (error) {
      console.error("Error enrolling in course:", error)
    } finally {
      setIsEnrolling(false)
    }
  }

  const getCourseBadge = () => {
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
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary break-words flex-1 min-w-0">{course.title}</h1>
      </div>

      {/* Video Preview Section - Show on mobile/tablet, hide on large screens */}
      <div className="mb-4 md:mb-6 lg:hidden">
        <Card className="border-primary/20">
          <CardContent className="p-4 md:p-6">
            <div
              className="relative aspect-video mb-4 rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setIsVideoModalOpen(true)}
            >
              <Image
                src={course.image || "/placeholder.svg?height=400&width=600"}
                alt={course.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                <PlayCircle className="w-16 h-16 text-white opacity-90 group-hover:opacity-100 transition-opacity" />
              </div>
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
            <p className="text-left lg:text-center text-xs md:text-sm text-muted-foreground mb-4">30-Day Money-Back Guarantee</p>
            <div className="space-y-2 md:space-y-2.5 text-muted-foreground">
              <div className="flex items-center">
                <Clock className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm">4 hours of on-demand video</span>
              </div>
              <div className="flex items-center">
                <FileText className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm">8 downloadable resources</span>
              </div>
              <div className="flex items-center">
                <Globe className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm break-words">{access}</span>
              </div>
              <div className="flex items-center">
                <Award className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm">Certificate of completion</span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm">{course.enrolledStudents || 0} learners enrolled</span>
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
              <p className="text-sm md:text-base text-muted-foreground mb-4 leading-relaxed">{course.description || ""}</p>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <span>{course.lessons?.length || 0} lessons</span>
                  <span>•</span>
                  <span>4 hours</span>
                  <span>•</span>
                  <span>{course.enrolledStudents || 0} students</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Course Content</h2>
              <Accordion type="single" collapsible className="w-full">
                {(course.lessons || []).map((lesson, index) => (
                  <AccordionItem value={`item-${index}`} key={lesson.id || index} className="border-b">
                    <AccordionTrigger className="py-3 md:py-4">
                      <div className="flex items-start justify-between w-full text-left">
                        <div className="flex items-start flex-1 min-w-0 pr-2">
                          <PlayCircle className="w-4 h-4 md:w-5 md:h-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
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
                              <span className="text-xs md:text-sm truncate">Quiz {index + 1}</span>
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
                                <Link className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
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
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="mb-4 md:mb-6">
            <CardContent className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-primary">Who this course is for:</h2>
              {course.whoIsThisFor ? (
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{course.whoIsThisFor}</p>
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
              {course.requirements ? (
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{course.requirements}</p>
              ) : (
                <ul className="list-disc pl-4 md:pl-5 text-sm md:text-base text-muted-foreground space-y-2">
                  <li>Open heart and willingness to learn</li>
                  <li>Desire for personal and spiritual growth</li>
                  <li>Commitment to complete the course materials</li>
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Instructor Profile Card */}
          {instructor && (
            <InstructorCard
              name={instructor.name}
              image={instructor.profileImage}
              bio={instructor.bio}
              title={instructor.title}
              className="mb-4"
            />
          )}
        </div>

        {/* Video Preview Section - Show only on large screens */}
        <div className="hidden lg:block lg:col-span-1">
          <Card className="sticky top-24 border-primary/20 h-fit">
            <CardContent className="p-6">
              <div
                className="relative aspect-video mb-4 rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setIsVideoModalOpen(true)}
              >
                <Image
                  src={module.image}
                  alt={module.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                  <PlayCircle className="w-16 h-16 text-white opacity-90 group-hover:opacity-100 transition-opacity" />
                </div>
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
              <p className="text-center text-sm text-muted-foreground mb-4">30-Day Money-Back Guarantee</p>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-primary" />
                  <span>4 hours of on-demand video</span>
                </div>
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary" />
                  <span>8 downloadable resources</span>
                </div>
                <div className="flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-primary" />
                  <span>{access}</span>
                </div>
                <div className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-primary" />
                  <span>Certificate of completion</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  <span>{module.enrolledStudents || 0} learners enrolled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        title={course.title}
      />
    </div>
  )
}
