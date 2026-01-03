"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useClientAuthState } from "@/utils/client-auth"
import { Award, Download, CheckCircle, XCircle, ArrowLeft, Trophy, BookOpen, Star, Loader2 } from "lucide-react"
import CourseSummarySkeleton from "@/components/CourseSummarySkeleton"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { extractIdFromSlug, createCourseSlug } from "@/lib/slug"
import { useCourse, useEnrollments } from "@/lib/react-query/hooks"

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
  
  const [quizResults, setQuizResults] = useState<{ [key: string]: QuizResult }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  // Fetch quiz results and certificate
  useEffect(() => {
    const fetchAdditionalData = async () => {
      if (!id || !course || !user) return

      try {
        setLoading(true)
        setError(null)

        const courseId = parseInt(id)
        if (isNaN(courseId)) {
          throw new Error("Invalid course ID")
        }

        // Fetch quiz results
        const quizResponse = await fetch(`/api/courses/${courseId}/quiz-results`)
        if (quizResponse.ok) {
          const quizData = await quizResponse.json()
          
          // Transform quiz results to match component structure
          const groupedResults: { [key: string]: QuizResult } = {}
          
          if (quizData.results && Array.isArray(quizData.results)) {
            const lessonGroups: { [lessonId: number]: any[] } = {}
            
            quizData.results.forEach((result: any) => {
              // API returns lesson_id (snake_case) from database
              const lessonId = result.lesson_id || result.lessonId
              if (!lessonGroups[lessonId]) {
                lessonGroups[lessonId] = []
              }
              lessonGroups[lessonId].push(result)
            })

            // Convert to component format
            Object.keys(lessonGroups).forEach((lessonIdStr) => {
              const lessonId = parseInt(lessonIdStr)
              const lessonResults = lessonGroups[lessonId]
              const lesson = course.lessons?.find((l: any) => l.id === lessonId)
              
              // Calculate points earned (from score field which now stores points)
              const pointsEarned = lessonResults.reduce((sum: number, r: any) => sum + (r.score || 0), 0)
              
              // Get total points from quiz questions
              let totalPoints = 0
              if (lesson?.quiz_questions && Array.isArray(lesson.quiz_questions)) {
                totalPoints = lesson.quiz_questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0)
              } else {
                // Fallback: if quiz_questions not available, use number of questions * 1
                totalPoints = lessonResults.length
              }
              
              // API returns is_correct (snake_case) from database
              const correctCount = lessonResults.filter((r: any) => r.is_correct || r.isCorrect).length
              const totalQuestions = lessonResults.length
              const score = totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 100) : 0
              
              groupedResults[lesson?.title || `Lesson ${lessonId}`] = {
                lessonId,
                lessonTitle: lesson?.title,
                score,
                correctCount,
                totalQuestions,
                pointsEarned,
                totalPoints,
                answers: lessonResults.map((r: any) => r.is_correct || r.isCorrect),
              }
            })
          }
          
          setQuizResults(groupedResults)
        } else {
          // No quiz results yet, set empty
          setQuizResults({})
        }

        // Fetch certificate if exists
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
        console.error("Error fetching additional data:", err)
        setError(err.message || "Failed to load course completion data")
      } finally {
        setLoading(false)
      }
    }

    if (course && user) {
      fetchAdditionalData()
    }
  }, [id, course, user])

  const calculateOverallScore = () => {
    if (!quizResults || Object.keys(quizResults).length === 0) return 0
    
    // Calculate weighted average based on points
    let totalPointsEarned = 0
    let totalPointsPossible = 0
    
    Object.values(quizResults).forEach((result: QuizResult) => {
      totalPointsEarned += result.pointsEarned
      totalPointsPossible += result.totalPoints
    })
    
    return totalPointsPossible > 0 ? Math.round((totalPointsEarned / totalPointsPossible) * 100) : 0
  }

  const handleDownloadCertificate = async () => {
    if (!certificateId) {
      alert("Certificate is not available yet. Please contact support.")
      return
    }

    try {
      setDownloadingCertificate(true)
      const response = await fetch(`/api/certificates/${certificateId}/download`)
      
      if (!response.ok) {
        throw new Error("Failed to download certificate")
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
    } catch (error: any) {
      console.error("Error downloading certificate:", error)
      alert("Failed to download certificate. Please try again later.")
    } finally {
      setDownloadingCertificate(false)
    }
  }

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  const hasData = !!course
  if ((!mounted || authLoading || coursePending || loading) && !hasData) {
    return <CourseSummarySkeleton />
  }

  if (courseError || error) {
    return (
      <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <p className="text-destructive">{courseError?.message || error || "Failed to load completion data"}</p>
          <Button onClick={() => router.push("/learner/courses")}>Back to Courses</Button>
        </div>
      </div>
    )
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
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex-shrink-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
              <CardTitle className="text-xl md:text-2xl">
                Course Completed! 🎉
              </CardTitle>
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
                <Progress value={100} className="h-2 md:h-3 mb-4" />
                <p className="text-xs md:text-sm text-muted-foreground">Completed on {completionDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Total Lessons</p>
                  <p className="text-xl md:text-2xl font-bold">{course.lessons.length}</p>
                </div>
                <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-primary opacity-50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Overall Score</p>
                  <p className="text-xl md:text-2xl font-bold">{overallScore}%</p>
                </div>
                <Award className="h-6 w-6 md:h-8 md:w-8 text-primary opacity-50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Your Certificate</p>
                  </div>
                  <Award className="h-6 w-6 md:h-8 md:w-8 text-primary opacity-50 flex-shrink-0" />
                </div>
                <Button 
                  onClick={handleDownloadCertificate} 
                  className="w-full min-h-[44px]" 
                  size="lg"
                  disabled={!certificateId || downloadingCertificate}
                  variant={certificateId ? "default" : "outline"}
                >
                  {downloadingCertificate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {certificateId ? "Download Certificate" : "Certificate Not Available"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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
