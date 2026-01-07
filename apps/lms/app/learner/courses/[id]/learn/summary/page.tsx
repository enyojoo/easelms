"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useClientAuthState } from "@/utils/client-auth"
import { Award, Download, CheckCircle, XCircle, ArrowLeft, Trophy, Star, Loader2 } from "lucide-react"
import CourseSummarySkeleton from "@/components/CourseSummarySkeleton"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { extractIdFromSlug, createCourseSlug } from "@/lib/slug"
import { useCourse, useEnrollments, useQuizResults, useProgress } from "@/lib/react-query/hooks"
import { toast } from "sonner"

interface Course {
  id: number
  title: string
  lessons: Array<{
    id: number
    title: string
    estimated_duration?: number
    quiz_questions?: Array<{
      id: string | number
      points?: number
    }>
  }>
}

interface QuizResult {
  lessonId: number
  lessonTitle?: string
  score: number
  correctCount: number
  totalQuestions: number
  pointsEarned: number
  totalPoints: number
  answers: boolean[]
}

export default function CourseCompletionPage() {
  const router = useRouter()
  const params = useParams()
  const slugOrId = params.id as string
  const id = extractIdFromSlug(slugOrId) // Extract actual ID from slug if present
  const { user, loading: authLoading, userType } = useClientAuthState()
  const { data: courseData, isPending: coursePending, error: courseError } = useCourse(id)
  const { data: enrollmentsData } = useEnrollments()
  const { data: quizResultsData } = useQuizResults(id)
  const { data: progressData } = useProgress(id)
  
  const [certificateId, setCertificateId] = useState<string | null>(null)
  const [downloadingCertificate, setDownloadingCertificate] = useState(false)
  const [mounted, setMounted] = useState(false)

  const course = courseData?.course

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && (!user || userType !== "user")) {
      router.push("/auth/learner/login")
    }
  }, [authLoading, user, userType, router])

  // Check enrollment and redirect if not enrolled or not completed
  useEffect(() => {
    if (!id || !course || authLoading || coursePending) return
    if (!enrollmentsData?.enrollments) return

    const courseId = parseInt(id)
    const enrollment = enrollmentsData.enrollments.find((e: any) => e.course_id === courseId)
    
    if (!enrollment) {
      // Not enrolled, redirect to course page
      router.push(`/learner/courses/${createCourseSlug(course.title, courseId)}`)
      return
    }

    if (enrollment.status !== "completed") {
      // Enrolled but not completed, redirect to learn page
      router.push(`/learner/courses/${createCourseSlug(course.title, courseId)}/learn`)
      return
    }
    // If we get here, enrollment exists and status is "completed" - allow access to summary page
  }, [id, course, enrollmentsData, router, authLoading, coursePending])

  // Fetch certificates (kept as manual fetch since no hook exists yet)
  useEffect(() => {
    const fetchCertificates = async () => {
      if (!id || !user) return

      try {
        const courseId = parseInt(id)
        if (isNaN(courseId)) {
          return
        }

        const certificatesResponse = await fetch("/api/certificates")
        if (certificatesResponse.ok) {
          const certificatesData = await certificatesResponse.json()
          const certificates = certificatesData.certificates || []
          const certificate = certificates.find((c: any) => c.courseId === courseId)
          if (certificate) {
            setCertificateId(certificate.id.toString())
          }
        }
      } catch (err: any) {
        console.error("Error fetching certificates:", err)
      }
    }

    if (user) {
      fetchCertificates()
    }
  }, [id, user])

  // Transform quiz results to match component structure (using React Query data)
  // Use quiz_score from progress table (like learn page) instead of recalculating
  const quizResults = useMemo(() => {
    if (!quizResultsData?.results || !course || !progressData?.progress) {
      return {}
    }

    const groupedResults: { [key: string]: QuizResult } = {}
    const lessonGroups: { [lessonId: number]: any[] } = {}
    
    // Group quiz results by lesson (for answers display)
    quizResultsData.results.forEach((result: any) => {
      // API returns lesson_id (snake_case) from database
      const lessonId = result.lesson_id || result.lessonId
      if (!lessonGroups[lessonId]) {
        lessonGroups[lessonId] = []
      }
      lessonGroups[lessonId].push(result)
    })

    // Create a map of quiz_score from progress table (matches learn page)
    const quizScoreMap: { [lessonId: number]: number } = {}
    progressData.progress.forEach((p: any) => {
      if (p.lesson_id && p.quiz_score !== null && p.quiz_score !== undefined) {
        quizScoreMap[p.lesson_id] = p.quiz_score // This is already a percentage (0-100)
      }
    })

    // Convert to component format
    Object.keys(lessonGroups).forEach((lessonIdStr) => {
      const lessonId = parseInt(lessonIdStr)
      const lessonResults = lessonGroups[lessonId]
      const lesson = course.lessons?.find((l: any) => l.id === lessonId)
      
      // Get quiz_score percentage from progress table (same as learn page)
      const scorePercentage = quizScoreMap[lessonId] || 0
      
      // Calculate points earned and total points for display
      // Match quiz component calculation: sum points for correct answers
      let pointsEarned = 0
      let totalPoints = 0
      
      if (lesson?.quiz_questions && Array.isArray(lesson.quiz_questions)) {
        // Create a map of question ID to question (with points)
        const questionMap = new Map<string | number, any>()
        lesson.quiz_questions.forEach((q: any) => {
          const qId = q.id?.toString() || q.id
          questionMap.set(qId, q)
        })
        
        // Calculate points earned by matching quiz_results with questions
        lessonResults.forEach((r: any) => {
          const questionId = r.quiz_question_id?.toString() || r.quiz_question_id
          const question = questionMap.get(questionId)
          
          if (question) {
            // Match quiz component: question.points || 1
            const questionPoints = question.points || 1
            totalPoints += questionPoints
            
            // If correct, add points; if incorrect, add 0
            if (r.is_correct || r.isCorrect) {
              pointsEarned += questionPoints
            }
          } else {
            // Fallback: if question not found, use score value or default to 1 point
            const questionPoints = 1
            totalPoints += questionPoints
            if (r.is_correct || r.isCorrect) {
              pointsEarned += (r.score || questionPoints)
            }
          }
        })
      } else {
        // Fallback: if quiz_questions not available, use score values from results
        pointsEarned = lessonResults.reduce((sum: number, r: any) => sum + (r.score || 0), 0)
        totalPoints = lessonResults.length
      }
      
      // API returns is_correct (snake_case) from database
      const correctCount = lessonResults.filter((r: any) => r.is_correct || r.isCorrect).length
      const totalQuestions = lessonResults.length
      
      groupedResults[lesson?.title || `Lesson ${lessonId}`] = {
        lessonId,
        lessonTitle: lesson?.title,
        score: scorePercentage, // Use quiz_score from progress table (percentage)
        correctCount,
        totalQuestions,
        pointsEarned,
        totalPoints,
        answers: lessonResults.map((r: any) => r.is_correct || r.isCorrect),
      }
    })

    return groupedResults
  }, [quizResultsData, course, progressData])

  const calculateOverallScore = () => {
    if (!quizResults || Object.keys(quizResults).length === 0) return 0
    
    // Calculate average of all quiz percentages (one percentage per lesson quiz)
    const percentages = Object.values(quizResults).map((result: QuizResult) => result.score)
    return percentages.length > 0 
      ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
      : 0
  }

  const handleDownloadCertificate = async () => {
    if (!course || !id) {
      toast.error("Course information is not available")
      return
    }

    try {
      setDownloadingCertificate(true)
      
      // Check if certificate is enabled for this course
      // The course API transforms flat columns into settings.certificate for frontend
      // But we should also check the flat column directly as fallback
      const certificateEnabled = course.settings?.certificate?.certificateEnabled ?? false
      
      console.log("[Summary Page] Certificate enabled check:", {
        fromSettings: course.settings?.certificate?.certificateEnabled,
        finalValue: certificateEnabled,
        courseId: course?.id,
      })
      
      if (!certificateEnabled) {
        toast.error("Certificate is not enabled for this course")
        setDownloadingCertificate(false)
        return
      }

      // If certificate doesn't exist, create it first
      let certId = certificateId
      if (!certId) {
        const courseId = parseInt(id)
        
        if (isNaN(courseId)) {
          throw new Error(`Invalid course ID: ${id}`)
        }

        const createResponse = await fetch("/api/certificates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        })

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}))
          const errorMessage = errorData.error || `Failed to create certificate (${createResponse.status})`
          console.error("Certificate creation error:", errorData)
          throw new Error(errorMessage)
        }

        const createData = await createResponse.json()
        certId = createData.certificate?.id?.toString() || null
        
        if (certId) {
          setCertificateId(certId)
        } else {
          throw new Error("Certificate was created but ID is missing")
        }
      }

      if (!certId) {
        throw new Error("Certificate ID is not available")
      }

      // Download the certificate
      console.log("[Summary Page] Downloading certificate:", certId)
      const response = await fetch(`/api/certificates/${certId}/download`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || `Failed to download certificate (${response.status})`
        console.error("[Summary Page] Certificate download error:", errorData)
        throw new Error(errorMessage)
      }

      // Get PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `certificate-${course?.title || "course"}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Certificate downloaded successfully")
    } catch (error: any) {
      console.error("Error downloading certificate:", error)
      toast.error(error.message || "Failed to download certificate. Please try again later.")
    } finally {
      setDownloadingCertificate(false)
    }
  }

  // Show error only if no cached data exists
  if (courseError && !course && !authLoading) {
    return (
      <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <p className="text-destructive">{courseError?.message || "Failed to load completion data"}</p>
          <Button onClick={() => router.push("/learner/courses")}>Back to Courses</Button>
        </div>
      </div>
    )
  }

  // Show skeleton only on true initial load (no cached data and auth loading)
  if (!mounted || (authLoading && !course)) {
    return <CourseSummarySkeleton />
  }

  // Render with cached data immediately if available
  if (!course && !authLoading) {
    return null // Will show on refetch
  }

  if (!course || !user) {
    return <CourseSummarySkeleton />
  }

  const overallScore = calculateOverallScore()
  
  // Get completion date from enrollment data
  const courseId = parseInt(id)
  const enrollment = enrollmentsData?.enrollments?.find((e: any) => e.course_id === courseId)
  const completionDate = enrollment?.completed_at 
    ? new Date(enrollment.completed_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

  return (
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Completion Celebration */}
        <Card className="mb-6 md:mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex-shrink-0">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
                <CardTitle className="text-xl md:text-2xl">
                  Course Completed! 🎉
                </CardTitle>
              </div>
              {(() => {
                const certificateEnabled = course?.settings?.certificate?.certificateEnabled || false
                
                // Only show download button if certificate is enabled
                if (!certificateEnabled) {
                  return null
                }
                
                const canDownload = !downloadingCertificate
                
                return (
              <Button
                onClick={handleDownloadCertificate}
                size="sm"
                    disabled={downloadingCertificate}
                    variant="default"
                className="flex-shrink-0"
              >
                {downloadingCertificate ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                        Download Certificate
                  </>
                )}
              </Button>
                )
              })()}
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-primary">Congratulations, {user.name?.split(" ")[0] || "Student"}!</h2>
                <p className="text-base md:text-lg text-muted-foreground mb-4">
                  You've successfully completed <strong className="break-words">{course.title}</strong>
                </p>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 md:h-5 md:w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-base md:text-lg">{overallScore}%</span>
                  </div>
                  <span className="text-sm md:text-base text-muted-foreground">Overall Score</span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">Completed on {completionDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 md:mb-8">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Quiz Results</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {Object.keys(quizResults).length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {Object.entries(quizResults).map(([lesson, result]: [string, QuizResult]) => (
                <Accordion key={lesson} type="single" collapsible className="w-full">
                  <AccordionItem value={lesson} className="border-b">
                    <AccordionTrigger className="py-3 md:py-4">
                      <div className="flex justify-between w-full items-center gap-2">
                        <span className="text-sm md:text-base text-left break-words flex-1">{lesson}</span>
                        <span className="text-sm md:text-base font-semibold flex-shrink-0">
                          {result.pointsEarned}/{result.totalPoints} pts
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 md:pt-3 md:pb-4">
                      {/* Mobile: Card view, Desktop: Table view */}
                      <div className="block md:hidden space-y-2">
                        {result.answers.map((answer: boolean, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                            <span className="text-sm">Question {index + 1}</span>
                            {answer ? (
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Question</TableHead>
                              <TableHead>Result</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.answers.map((answer: boolean, index: number) => (
                              <TableRow key={index}>
                                <TableCell>Question {index + 1}</TableCell>
                                <TableCell>
                                  {answer ? (
                                    <CheckCircle className="text-green-500" />
                                  ) : (
                                    <XCircle className="text-red-500" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm md:text-base">No quiz results available yet.</p>
              </div>
            )}
            {Object.keys(quizResults).length > 0 && (
              <div className="mt-4 md:mt-6 text-center">
                <span className="text-lg md:text-xl font-semibold">Overall Score: {calculateOverallScore()}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-4">
              <p className="text-sm md:text-base text-muted-foreground">
                Continue your learning journey! Explore more courses to expand your skills and knowledge.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Button 
                  onClick={() => router.push(`/learner/courses/${createCourseSlug(course.title, parseInt(id))}/learn`)} 
                  variant="outline" 
                  className="flex-1 min-h-[44px]"
                >
                  View Course Again
                </Button>
                <Button onClick={() => router.push("/learner/courses")} variant="outline" className="flex-1 min-h-[44px]">
                  Browse More Courses
                </Button>
                <Button onClick={() => router.push("/learner/dashboard")} variant="outline" className="flex-1 min-h-[44px]">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
