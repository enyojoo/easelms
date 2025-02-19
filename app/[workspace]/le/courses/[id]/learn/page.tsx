"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getClientAuthState } from "@/app/utils/client-auth" // Correct import
import { modules } from "@/app/data/courses"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle2, ArrowLeft } from "lucide-react"
import VideoPlayer from "./components/VideoPlayer"
import QuizComponent from "./components/QuizComponent"
import ResourcesPanel from "./components/ResourcesPanel"

// Updated quiz data for each lesson
const lessonQuizzes = {
  "Intro to Communication": {
    questions: [
      {
        question: "What is the primary purpose of communication?",
        options: [
          "To express emotions only",
          "To exchange information and create understanding",
          "To speak in public",
          "To write emails",
        ],
        correctAnswer: 1,
      },
      {
        question: "Which of the following is a key element of effective communication?",
        options: ["Speaking quickly", "Using complex vocabulary", "Active listening", "Avoiding eye contact"],
        correctAnswer: 2,
      },
    ],
  },
  "Public Speaking Essentials": {
    questions: [
      {
        question: "What is the most important aspect of public speaking?",
        options: ["Wearing formal attire", "Speaking loudly", "Audience engagement", "Memorizing the script"],
        correctAnswer: 2,
      },
      {
        question: "How can you overcome public speaking anxiety?",
        options: ["Avoid preparation", "Practice and preparation", "Speak quickly", "Read directly from notes"],
        correctAnswer: 1,
      },
    ],
  },
  "Non-Verbal Communication": {
    questions: [
      {
        question: "Which of these is an example of non-verbal communication?",
        options: ["Speaking", "Writing", "Body language", "Singing"],
        correctAnswer: 2,
      },
      {
        question: "What percentage of communication is non-verbal?",
        options: ["20%", "40%", "60%", "93%"],
        correctAnswer: 3,
      },
    ],
  },
  "Active Listening Skills": {
    questions: [
      {
        question: "What is the main goal of active listening?",
        options: [
          "To interrupt the speaker",
          "To formulate your response while the other person is talking",
          "To understand and retain the information being communicated",
          "To finish the conversation quickly",
        ],
        correctAnswer: 2,
      },
      {
        question: "Which of the following is NOT a characteristic of active listening?",
        options: [
          "Maintaining eye contact",
          "Providing verbal and non-verbal feedback",
          "Interrupting to share your own experiences",
          "Asking clarifying questions",
        ],
        correctAnswer: 2,
      },
    ],
  },
  "Persuasive Communication": {
    questions: [
      {
        question: "What is the primary goal of persuasive communication?",
        options: [
          "To entertain the audience",
          "To inform the audience",
          "To influence the audience's beliefs or actions",
          "To confuse the audience",
        ],
        correctAnswer: 2,
      },
      {
        question: "Which of these is NOT one of Aristotle's three modes of persuasion?",
        options: ["Ethos (Credibility)", "Pathos (Emotional Appeal)", "Logos (Logical Appeal)", "Kairos (Timing)"],
        correctAnswer: 3,
      },
    ],
  },
  "Effective Storytelling": {
    questions: [
      {
        question: "Why is storytelling an effective communication tool?",
        options: [
          "It helps people remember information better",
          "It creates emotional connections",
          "It makes complex ideas more accessible",
          "All of the above",
        ],
        correctAnswer: 3,
      },
      {
        question: "What is the typical structure of a story?",
        options: [
          "Beginning, Climax, Ending",
          "Introduction, Body, Conclusion",
          "Setup, Confrontation, Resolution",
          "Opening, Middle, Finale",
        ],
        correctAnswer: 2,
      },
    ],
  },
  "Presentation Skills with Tech": {
    questions: [
      {
        question: "What is the '10-20-30 Rule' in presentations?",
        options: [
          "10 slides, 20 minutes, 30-point font",
          "10 minutes, 20 slides, 30 seconds per slide",
          "10 sections, 20 slides, 30 minutes",
          "10 points, 20 examples, 30 minutes",
        ],
        correctAnswer: 0,
      },
      {
        question: "Which of these is NOT a recommended practice for using technology in presentations?",
        options: [
          "Using high-quality images",
          "Including minimal text on slides",
          "Adding complex animations to every slide",
          "Practicing with the technology beforehand",
        ],
        correctAnswer: 2,
      },
    ],
  },
  "Handling Q&A and Feedback": {
    questions: [
      {
        question: "What should you do if you don't know the answer to a question during Q&A?",
        options: [
          "Make up an answer",
          "Ignore the question",
          "Admit you don't know and offer to find out",
          "Change the subject",
        ],
        correctAnswer: 2,
      },
      {
        question: "Which of these is a good practice for handling negative feedback?",
        options: [
          "Argue with the person giving feedback",
          "Ignore the feedback completely",
          "Listen actively and ask for specific examples",
          "Take it personally and get defensive",
        ],
        correctAnswer: 2,
      },
    ],
  },
}

// Updated resources data for each lesson
const lessonResources = {
  "Intro to Communication": [
    { type: "document", title: "Communication Basics PDF", url: "/dummy-files/communication-basics.pdf" },
    { type: "link", title: "Effective Communication Techniques", url: "https://example.com/effective-communication" },
  ],
  "Public Speaking Essentials": [
    { type: "document", title: "Public Speaking Cheat Sheet", url: "/dummy-files/public-speaking-cheatsheet.pdf" },
    { type: "link", title: "TED Talks on Public Speaking", url: "https://example.com/ted-talks-public-speaking" },
  ],
  "Non-Verbal Communication": [
    { type: "document", title: "Body Language Guide", url: "/dummy-files/body-language-guide.pdf" },
    {
      type: "link",
      title: "Non-Verbal Cues in Different Cultures",
      url: "https://example.com/non-verbal-cues-cultures",
    },
  ],
  "Active Listening Skills": [
    { type: "document", title: "Active Listening Techniques", url: "/dummy-files/active-listening-techniques.pdf" },
    {
      type: "link",
      title: "The Importance of Active Listening",
      url: "https://example.com/importance-of-active-listening",
    },
  ],
  "Persuasive Communication": [
    { type: "document", title: "Persuasion Techniques Guide", url: "/dummy-files/persuasion-techniques.pdf" },
    { type: "link", title: "The Art of Persuasion in Business", url: "https://example.com/persuasion-in-business" },
  ],
  "Effective Storytelling": [
    { type: "document", title: "Storytelling in Business PDF", url: "/dummy-files/storytelling-in-business.pdf" },
    { type: "link", title: "The Science of Storytelling", url: "https://example.com/science-of-storytelling" },
  ],
  "Presentation Skills with Tech": [
    { type: "document", title: "Tech Presentation Tips", url: "/dummy-files/tech-presentation-tips.pdf" },
    { type: "link", title: "Best Presentation Software 2023", url: "https://example.com/best-presentation-software" },
  ],
  "Handling Q&A and Feedback": [
    { type: "document", title: "Q&A Session Best Practices", url: "/dummy-files/qa-best-practices.pdf" },
    {
      type: "link",
      title: "Dealing with Difficult Questions",
      url: "https://example.com/handling-difficult-questions",
    },
  ],
}

export default function CourseLearningPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [course, setCourse] = useState<any>(null)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("video")
  const [completedLessons, setCompletedLessons] = useState<number[]>([])
  const [allLessonsCompleted, setAllLessonsCompleted] = useState(false)

  useEffect(() => {
    const { isLoggedIn, userType } = getClientAuthState()
    if (!isLoggedIn || userType !== "learner") {
      router.push("/login")
    } else {
      const courseData = modules.find((m) => m.id === Number.parseInt(params.id))
      if (courseData) {
        setCourse(courseData)
      } else {
        router.push("/courses")
      }
    }
  }, [router, params.id])

  const handleLessonComplete = () => {
    if (!completedLessons.includes(currentLessonIndex)) {
      const newCompletedLessons = [...completedLessons, currentLessonIndex]
      setCompletedLessons(newCompletedLessons)
      const newProgress = (newCompletedLessons.length / course.lessons.length) * 100
      setProgress(newProgress)
      if (newCompletedLessons.length === course.lessons.length) {
        setAllLessonsCompleted(true)
      }
    }
    setActiveTab("quiz")
  }

  const handleQuizComplete = () => {
    setActiveTab("resources")
  }

  const handleNextLesson = () => {
    if (activeTab === "video") {
      setActiveTab("quiz")
    } else if (activeTab === "quiz") {
      setActiveTab("resources")
    } else if (activeTab === "resources") {
      if (currentLessonIndex < course.lessons.length - 1) {
        setCurrentLessonIndex(currentLessonIndex + 1)
        setActiveTab("video")
      } else {
        // All lessons completed, redirect to summary page
        router.push(`/courses/${params.id}/learn/summary`)
      }
    }
  }

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1)
      setActiveTab("video")
    }
  }

  if (!course) return null

  const currentLesson = course.lessons[currentLessonIndex]

  return (
    <div className="pt-2 pb-2 md:pt-5 md:pb-5 px-1 sm:px-2 md:px-3 lg:px-6">
      <div className="max-w-full lg:max-w-[1800px] mx-auto py-2 flex-grow">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Course: {course.title}</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-grow flex flex-col order-1 lg:order-none w-full lg:w-[70%]">
            <div className="rounded-lg overflow-hidden bg-card border border-border flex-grow flex flex-col shadow-lg">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-grow flex flex-col">
                <TabsList className="w-full justify-start bg-muted p-0 h-12 border-b border-border">
                  <TabsTrigger
                    value="video"
                    className="rounded-none h-12 px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Video
                  </TabsTrigger>
                  <TabsTrigger
                    value="quiz"
                    className="rounded-none h-12 px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Quiz
                  </TabsTrigger>
                  <TabsTrigger
                    value="resources"
                    className="rounded-none h-12 px-8 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    Resources
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="video" className="flex-grow m-0 p-0 flex overflow-hidden">
                  <div className="w-full h-full lg:h-[370px] aspect-video relative">
                    <VideoPlayer
                      lessonTitle={currentLesson.title}
                      onComplete={handleLessonComplete}
                      autoPlay={true}
                      isActive={activeTab === "video"}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="quiz" className="flex-grow m-0 p-4 md:p-6 lg:h-[370px] overflow-y-auto">
                  <QuizComponent
                    quiz={{ questions: lessonQuizzes[currentLesson.title].questions }}
                    onComplete={handleQuizComplete}
                  />
                </TabsContent>

                <TabsContent value="resources" className="flex-grow m-0 p-4 md:p-6 lg:h-[370px] overflow-y-auto">
                  <ResourcesPanel resources={lessonResources[currentLesson.title]} />
                </TabsContent>
              </Tabs>

              <div className="p-3 md:p-4 border-t border-border bg-background">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    onClick={handlePreviousLesson}
                    disabled={currentLessonIndex === 0}
                    className="text-foreground bg-background hover:bg-primary/10 hover:text-primary w-full sm:w-auto"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>

                  <div className="text-center w-full sm:w-auto">
                    <p className="text-sm text-muted-foreground mb-1">
                      Lesson {currentLessonIndex + 1} of {course.lessons.length}
                    </p>
                    <Progress value={progress} className="w-full sm:w-[200px] bg-secondary" />
                  </div>

                  <Button
                    variant={allLessonsCompleted ? "default" : "outline"}
                    onClick={
                      allLessonsCompleted ? () => router.push(`/courses/${params.id}/learn/summary`) : handleNextLesson
                    }
                    disabled={
                      !allLessonsCompleted &&
                      activeTab === "resources" &&
                      currentLessonIndex === course.lessons.length - 1
                    }
                    className={`text-foreground w-full sm:w-auto ${
                      allLessonsCompleted
                        ? "bg-primary hover:bg-primary-dark text-primary-foreground"
                        : "bg-background hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {allLessonsCompleted ? (
                      <>
                        Complete Course <CheckCircle2 className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Next <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[30%] mb-6 lg:mb-0 order-2 lg:order-none lg:pl-6">
            <div className="rounded-lg bg-card border border-border p-4 h-full overflow-auto shadow-lg">
              <h3 className="text-base font-semibold mb-4">Course Content</h3>
              <div className="space-y-2">
                {course.lessons.map((lesson: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentLessonIndex(index)
                      setActiveTab("video")
                    }}
                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors text-sm ${
                      index === currentLessonIndex
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <div className="flex items-center">
                      <BookOpen className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{lesson.title}</span>
                    </div>
                    {completedLessons.includes(index) && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

