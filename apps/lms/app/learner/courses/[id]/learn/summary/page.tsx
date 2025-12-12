"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getClientAuthState } from "@/utils/client-auth" // Correct import
import { modules } from "@/data/courses"
import { Award, Download, CheckCircle, XCircle, ArrowLeft } from "lucide-react"
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

  useEffect(() => {
    const { isLoggedIn, userType } = getClientAuthState()
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/learner/login")
    } else {
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

  if (!course) return null

  return (
    <div className="pt-4 md:pt-8 ">
      <div className="container-fluid max-w-[1600px] mx-auto py-2 flex-grow ">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center mb-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
              <CardTitle>
                <h1 className="text-2xl font-bold">Overview: {course.title}</h1>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold">Overall Progress:</span>
              <span className="text-lg font-semibold">100%</span>
            </div>
            <Progress value={100} className="h-2 mb-4" />
            <p className="text-left text-sm mt-4">Congratulations on finishing the course!</p>
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

        <div className="flex justify-center">
          <Button onClick={handleDownloadCertificate} size="lg" className="px-8">
            <Download className="mr-2 h-4 w-4" /> Download Certificate
          </Button>
        </div>
      </div>
    </div>
  )
}
