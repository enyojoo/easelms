"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getClientAuthState } from "@/utils/client-auth" // Correct import
import { modules } from "@/data/courses"
import { Award, Download, CheckCircle, XCircle, ArrowLeft, Trophy, Clock, BookOpen, Star } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

// Mock data for quiz results
const mockQuizResults = {
  "Intro to Communication": {
    score: 90,
    totalQuestions: 10,
    answers: [true, true, false, true, true, true, true, false, true, true],
  },
  "Public Speaking Essentials": {
    score: 85,
    totalQuestions: 10,
    answers: [true, false, true, true, true, false, true, true, true, true],
  },
  "Non-Verbal Communication": {
    score: 95,
    totalQuestions: 10,
    answers: [true, true, true, true, false, true, true, true, true, true],
  },
  "Active Listening Skills": {
    score: 80,
    totalQuestions: 10,
    answers: [true, true, false, true, true, false, true, true, true, false],
  },
  "Persuasive Communication": {
    score: 100,
    totalQuestions: 10,
    answers: [true, true, true, true, true, true, true, true, true, true],
  },
  "Effective Storytelling": {
    score: 90,
    totalQuestions: 10,
    answers: [true, true, true, false, true, true, true, true, true, true],
  },
  "Presentation Skills with Tech": {
    score: 85,
    totalQuestions: 10,
    answers: [true, true, false, true, true, true, false, true, true, true],
  },
  "Handling Q&A and Feedback": {
    score: 95,
    totalQuestions: 10,
    answers: [true, true, true, true, true, false, true, true, true, true],
  },
}


export default function CourseCompletionPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [course, setCourse] = useState<any>(null)
  const [quizResults, setQuizResults] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/learner/login")
    } else {
      setUser(user)
      const courseData = modules.find((m) => m.id === Number.parseInt(id))
      if (courseData) {
        setCourse(courseData)
        setQuizResults(mockQuizResults)
      } else {
        router.push("/learner/courses")
      }
    }
  }, [router, id])

  const calculateOverallScore = () => {
    if (!quizResults) return 0
    const scores = Object.values(quizResults).map((result: any) => result.score)
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  const handleDownloadCertificate = () => {
    // In a real application, this would generate and download a PDF certificate
    console.log("Downloading certificate...")
    alert("Certificate download started!")
  }

  if (!course || !user) return null

  const overallScore = calculateOverallScore()
  const totalTimeSpent = "4 hours" // Mock data
  const completionDate = new Date().toLocaleDateString("en-US", {
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
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Time Spent</p>
                  <p className="text-xl md:text-2xl font-bold">{totalTimeSpent}</p>
                </div>
                <Clock className="h-6 w-6 md:h-8 md:w-8 text-primary opacity-50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Average Score</p>
                  <p className="text-xl md:text-2xl font-bold">{overallScore}%</p>
                </div>
                <Award className="h-6 w-6 md:h-8 md:w-8 text-primary opacity-50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Certificate Download */}
        <Card className="mb-6 md:mb-8">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Your Certificate</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="flex flex-col items-center justify-center py-6 md:py-8">
              <Award className="h-16 w-16 md:h-20 md:w-20 text-primary mb-4 opacity-50" />
              <p className="text-sm md:text-base text-muted-foreground mb-6 text-center">
                Download your certificate of completion for {course.title}
              </p>
              <Button onClick={handleDownloadCertificate} className="min-h-[44px]" size="lg">
                <Download className="mr-2 h-4 w-4" />
                Download Certificate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 md:mb-8">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Quiz Results</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-3 md:space-y-4">
              {Object.entries(quizResults).map(([lesson, result]: [string, any]) => (
                <Accordion key={lesson} type="single" collapsible className="w-full">
                  <AccordionItem value={lesson} className="border-b">
                    <AccordionTrigger className="py-3 md:py-4">
                      <div className="flex justify-between w-full items-center gap-2">
                        <span className="text-sm md:text-base text-left break-words flex-1">{lesson}</span>
                        <span className="text-sm md:text-base font-semibold flex-shrink-0">
                          {result.score}/{result.totalQuestions}
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
            <div className="mt-4 md:mt-6 text-center">
              <span className="text-lg md:text-xl font-semibold">Overall Score: {calculateOverallScore()}%</span>
            </div>
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
