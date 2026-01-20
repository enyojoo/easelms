"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { extractIdFromSlug } from "@/lib/slug"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BookOpen, Clock, Users, PlayCircle, CheckCircle2, FileText, Globe, Award, BrainCircuit } from "lucide-react"
import SafeImage from "@/components/SafeImage"
import EnrollmentCTA from "@/components/EnrollmentCTA"
import VideoModal from "@/components/VideoModal"
import InstructorCard from "@/components/InstructorCard"
import ReadMore from "@/components/ReadMore"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Logo from "@/components/Logo"
import { Module } from "@/lib/types/course"
import { formatCurrency } from "@/lib/utils/currency"
import { useBrandSettings } from "@/lib/hooks/useBrandSettings"

// You can use environment variables for the app URL
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://app.example.com").replace(/\/$/, '') // Remove trailing slash

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)

  const brandSettings = useBrandSettings()
  const platformName = brandSettings.platformName || "EaseLMS"

  const slugOrId = params.id as string // Can be either "course-title-123" or just "123"
  const courseId = extractIdFromSlug(slugOrId)

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true)
        // Use the original slug/ID from params, let the API route handle extraction
        const response = await fetch(`/api/courses/${slugOrId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError("Course not found")
          } else {
            throw new Error("Failed to fetch course")
          }
          return
        }
        const data = await response.json()
        setCourse(data.course)
      } catch (err: any) {
        setError(err.message || "Failed to load course")
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      fetchCourse()
    }
  }, [courseId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-32 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="aspect-video bg-muted rounded-lg"></div>
                <div className="space-y-4">
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-64 bg-muted rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Button onClick={() => router.push("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const enrollmentMode = course.settings?.enrollment?.enrollmentMode || "free"
  const coursePrice = course.price || course.settings?.enrollment?.price || 0

  const getAccessDetails = () => {
    if (enrollmentMode === "free") {
      return {
        price: "Free",
        buttonText: "Enroll",
        access: "Full access for 3 months",
      }
    }
    if (enrollmentMode === "buy" && coursePrice > 0) {
      return {
        price: formatCurrency(coursePrice, "USD"),
        buttonText: "Buy",
        access: "Full access for 3 months",
      }
    }
    return {
      price: "Free",
      buttonText: "Enroll",
      access: "Full access for 3 months",
    }
  }

  const { price, buttonText, access } = getAccessDetails()

  const getCourseBadge = () => {
    switch (enrollmentMode) {
      case "free":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Free</Badge>
      case "buy":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Paid</Badge>
      case "recurring":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Subscription</Badge>
      default:
        return null
    }
  }

  // Calculate total resources from lessons
  const totalResources = (course?.lessons || []).reduce((total, lesson) => {
    return total + (lesson?.resources?.length || 0)
  }, 0)

  const videoUrl = course?.previewVideo || ""

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

  // Get enrollment count from course data (total enrollments for the course)
  const enrollmentCount = course?.enrolledStudents || 0

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo className="w-44" />
          </Link>
          <div className="flex gap-2">
            <Link href={`${APP_URL}/auth/learner/login`}>
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href={`${APP_URL}/auth/learner/signup`}>
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
          <div className="flex items-center gap-2 mb-4 md:mb-6 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="flex-shrink-0">
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
              </div>
              <div className="flex-shrink-0">{getCourseBadge()}</div>
            </div>
            <Button
              className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90 h-11 md:h-10"
              onClick={() => window.open(`${APP_URL}/learner/courses/${slugOrId}`, '_blank')}
            >
              {buttonText}
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
                <span className="text-xs md:text-sm">{enrollmentCount} learners enrolled</span>
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
                                  <Globe className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
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
                  {enrollmentMode === "recurring" && <span className="text-sm text-muted-foreground">/month</span>}
                </div>
                {getCourseBadge()}
              </div>
              <Button
                className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => window.open(`${APP_URL}/learner/courses/${slugOrId}`, '_blank')}
              >
                {buttonText}
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
          </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Logo className="w-32 mb-4" />
              <p className="text-muted-foreground mb-4 max-w-md">
                Transform your life through knowledge with {platformName}. Access world-class courses designed to help you achieve your goals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
                <li><Link href="/#courses" className="hover:text-primary transition-colors">Courses</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {platformName}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={videoUrl}
        title={course?.title || ""}
      />
    </div>
  )
}