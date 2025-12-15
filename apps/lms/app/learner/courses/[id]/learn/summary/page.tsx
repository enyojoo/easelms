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
import CertificatePreview from "@/components/CertificatePreview"
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

const mockAchievements = [
  { id: 1, name: "Course Completed", description: "You've completed the entire course!" },
  { id: 2, name: "Quiz Master", description: "You've scored over 90% on all quizzes" },
  { id: 3, name: "Speedy Learner", description: "You've completed the course in record time" },
]

export default function CourseCompletionPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [course, setCourse] = useState<any>(null)
  const [quizResults, setQuizResults] = useState<any>(null)
  const [achievements, setAchievements] = useState<any[]>([])
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
        setAchievements(mockAchievements)
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
    <div className="pt-4 md:pt-8">
      <div className="container-fluid max-w-[1600px] mx-auto py-2 flex-grow">
        {/* Completion Celebration */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center mb-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
              <CardTitle>
                <h1 className="text-2xl font-bold">Course Completed! 🎉</h1>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold mb-2 text-primary">Congratulations, {user.name?.split(" ")[0] || "Student"}!</h2>
                <p className="text-lg text-muted-foreground mb-4">
                  You've successfully completed <strong>{course.title}</strong>
                </p>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-lg">{overallScore}%</span>
                  </div>
                  <span className="text-muted-foreground">Overall Score</span>
                </div>
                <Progress value={100} className="h-3 mb-4" />
                <p className="text-sm text-muted-foreground">Completed on {completionDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Lessons</p>
                  <p className="text-2xl font-bold">{course.lessons.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
                  <p className="text-2xl font-bold">{totalTimeSpent}</p>
                </div>
                <Clock className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Average Score</p>
                  <p className="text-2xl font-bold">{overallScore}%</p>
                </div>
                <Award className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Certificate Preview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <CertificatePreview
              courseTitle={course.title}
              learnerName={user.name || "Student"}
              completionDate={completionDate}
              onDownload={handleDownloadCertificate}
            />
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quiz Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(quizResults).map(([lesson, result]: [string, any]) => (
                <Accordion key={lesson} type="single" collapsible className="w-full">
                  <AccordionItem value={lesson}>
                    <AccordionTrigger>
                      <div className="flex justify-between w-full">
                        <span>{lesson}</span>
                        <span>
                          {result.score}/{result.totalQuestions}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
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
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
            <div className="mt-6 text-center">
              <span className="text-xl font-semibold">Overall Score: {calculateOverallScore()}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className="bg-muted">
                  <CardContent className="p-4 flex items-center space-x-4">
                    <Award className="h-8 w-8 text-yellow-500" />
                    <div>
                      <h3 className="font-semibold">{achievement.name}</h3>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Continue your learning journey! Explore more courses to expand your skills and knowledge.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => router.push("/learner/courses")} variant="outline" className="flex-1">
                  Browse More Courses
                </Button>
                <Button onClick={() => router.push("/learner/dashboard")} variant="outline" className="flex-1">
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
