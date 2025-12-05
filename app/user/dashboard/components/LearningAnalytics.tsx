"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Award, 
  BookOpen, 
  Target,
  Brain,
  Zap,
  Calendar,
  ChevronRight
} from "lucide-react"

interface LearningAnalyticsProps {
  userType: "user" | "admin"
}

interface AnalyticsData {
  overview: {
    totalCourses: number
    completedCourses: number
    inProgressCourses: number
    totalStudyTime: number
    averageScore: number
    streak: number
  }
  progress: {
    courseId: string
    courseName: string
    progress: number
    lastAccessed: string
    estimatedCompletion: string
  }[]
  performance: {
    subject: string
    score: number
    attempts: number
    improvement: number
  }[]
  insights: {
    type: "achievement" | "warning" | "suggestion"
    title: string
    description: string
    action?: string
  }[]
  weeklyActivity: {
    day: string
    studyTime: number
    coursesAccessed: number
  }[]
}

export default function LearningAnalytics({ userType }: LearningAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setAnalyticsData({
        overview: {
          totalCourses: 12,
          completedCourses: 8,
          inProgressCourses: 4,
          totalStudyTime: 156, // hours
          averageScore: 87,
          streak: 7
        },
        progress: [
          {
            courseId: "1",
            courseName: "Digital Marketing Fundamentals",
            progress: 75,
            lastAccessed: "2 hours ago",
            estimatedCompletion: "3 days"
          },
          {
            courseId: "2",
            courseName: "JavaScript Advanced Concepts",
            progress: 45,
            lastAccessed: "1 day ago",
            estimatedCompletion: "1 week"
          },
          {
            courseId: "3",
            courseName: "UI/UX Design Principles",
            progress: 90,
            lastAccessed: "30 minutes ago",
            estimatedCompletion: "1 day"
          }
        ],
        performance: [
          {
            subject: "JavaScript",
            score: 92,
            attempts: 3,
            improvement: 15
          },
          {
            subject: "Design",
            score: 88,
            attempts: 2,
            improvement: 8
          },
          {
            subject: "Marketing",
            score: 85,
            attempts: 4,
            improvement: 12
          }
        ],
        insights: [
          {
            type: "achievement",
            title: "7-Day Learning Streak! 🔥",
            description: "You've been consistent with your learning. Keep it up!",
            action: "View streak details"
          },
          {
            type: "suggestion",
            title: "Focus on JavaScript",
            description: "Your JavaScript scores are improving. Consider taking advanced courses.",
            action: "Browse courses"
          },
          {
            type: "warning",
            title: "UI/UX Course Almost Complete",
            description: "You're 90% done with UI/UX Design Principles. Finish it today!",
            action: "Continue course"
          }
        ],
        weeklyActivity: [
          { day: "Mon", studyTime: 2.5, coursesAccessed: 3 },
          { day: "Tue", studyTime: 1.8, coursesAccessed: 2 },
          { day: "Wed", studyTime: 3.2, coursesAccessed: 4 },
          { day: "Thu", studyTime: 2.1, coursesAccessed: 2 },
          { day: "Fri", studyTime: 4.0, coursesAccessed: 5 },
          { day: "Sat", studyTime: 1.5, coursesAccessed: 1 },
          { day: "Sun", studyTime: 2.8, coursesAccessed: 3 }
        ]
      })
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!analyticsData) return null

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{analyticsData.overview.totalCourses}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{analyticsData.overview.completedCourses}</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Study Time</p>
                <p className="text-2xl font-bold">{analyticsData.overview.totalStudyTime}h</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">{analyticsData.overview.averageScore}%</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Course Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsData.progress.map((course) => (
                <div key={course.courseId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{course.courseName}</h3>
                    <Badge variant="outline">{course.progress}%</Badge>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Last accessed: {course.lastAccessed}</span>
                    <span>Est. completion: {course.estimatedCompletion}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance by Subject
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsData.performance.map((subject, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Brain className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{subject.subject}</h3>
                      <p className="text-sm text-muted-foreground">
                        {subject.attempts} attempts • +{subject.improvement}% improvement
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{subject.score}%</p>
                    <p className="text-sm text-green-600">+{subject.improvement}%</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI-Powered Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsData.insights.map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  insight.type === "achievement" ? "border-green-500 bg-green-50" :
                  insight.type === "warning" ? "border-yellow-500 bg-yellow-50" :
                  "border-blue-500 bg-blue-50"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                    {insight.action && (
                      <Button variant="ghost" size="sm" className="ml-2">
                        {insight.action}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.weeklyActivity.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 text-sm font-medium">{day.day}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(day.studyTime / 4) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground">{day.studyTime}h</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {day.coursesAccessed} courses accessed
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
