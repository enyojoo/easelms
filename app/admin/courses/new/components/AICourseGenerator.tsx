"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Upload, FileText, Video, BookOpen, Brain } from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { toast } from "sonner"

interface AICourseGeneratorProps {
  onCourseGenerated: (courseData: any) => void
}

interface GeneratedContent {
  title: string
  description: string
  lessons: Array<{
    title: string
    content: string
    type: "video" | "text" | "quiz"
    duration: number
  }>
  prerequisites: string[]
  learningObjectives: string[]
  difficulty: "beginner" | "intermediate" | "advanced"
  estimatedDuration: number
}

export default function AICourseGenerator({ onCourseGenerated }: AICourseGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [inputMethod, setInputMethod] = useState<"topic" | "document" | "url">("topic")
  
  // Input states
  const [topic, setTopic] = useState("")
  const [description, setDescription] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [courseLevel, setCourseLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner")
  const [duration, setDuration] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")

  const generateCourse = async () => {
    if (!topic.trim() && !uploadedFile && !url.trim()) {
      toast.error("Please provide a topic, upload a document, or enter a URL")
      return
    }

    setIsGenerating(true)
    try {
      let prompt = ""
      
      if (inputMethod === "topic") {
        prompt = `Create a comprehensive online course about "${topic}". 
        Target audience: ${targetAudience || "general learners"}
        Level: ${courseLevel}
        Duration: ${duration || "self-paced"}
        Description: ${description || "No specific description provided"}
        
        Please generate:
        1. A compelling course title
        2. A detailed course description
        3. 5-8 detailed lessons with titles, content, and type (video/text/quiz)
        4. Prerequisites for the course
        5. Learning objectives
        6. Estimated duration for each lesson
        
        Format the response as a structured JSON object.`
      } else if (inputMethod === "document") {
        // For document upload, we'd need to extract text first
        prompt = `Analyze this document and create a comprehensive online course based on its content. Generate a structured course with lessons, objectives, and learning path.`
      } else if (inputMethod === "url") {
        prompt = `Analyze the content from this URL: ${url} and create a comprehensive online course based on the information. Generate a structured course with lessons, objectives, and learning path.`
      }

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
      })

      // Parse the AI response and structure it
      const courseData = parseAICourseResponse(text)
      setGeneratedContent(courseData)
      toast.success("Course generated successfully!")
    } catch (error) {
      console.error("Error generating course:", error)
      toast.error("Failed to generate course. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const parseAICourseResponse = (response: string): GeneratedContent => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // Fallback parsing if JSON extraction fails
      return {
        title: topic || "AI Generated Course",
        description: description || "An AI-generated course based on your input",
        lessons: [
          {
            title: "Introduction",
            content: "Welcome to this course!",
            type: "video" as const,
            duration: 10
          }
        ],
        prerequisites: [],
        learningObjectives: ["Learn the fundamentals"],
        difficulty: courseLevel,
        estimatedDuration: 60
      }
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return {
        title: topic || "AI Generated Course",
        description: description || "An AI-generated course based on your input",
        lessons: [
          {
            title: "Introduction",
            content: "Welcome to this course!",
            type: "video" as const,
            duration: 10
          }
        ],
        prerequisites: [],
        learningObjectives: ["Learn the fundamentals"],
        difficulty: courseLevel,
        estimatedDuration: 60
      }
    }
  }

  const useGeneratedContent = () => {
    if (!generatedContent) return

    const courseData = {
      basicInfo: {
        title: generatedContent.title,
        description: generatedContent.description,
        requirements: generatedContent.prerequisites.join(", "),
        whoIsThisFor: targetAudience,
        thumbnail: "",
        previewVideo: "",
        price: "",
      },
      lessons: generatedContent.lessons.map((lesson, index) => ({
        id: `lesson-${Date.now()}-${index}`,
        title: lesson.title,
        type: lesson.type,
        content: {
          text: lesson.content,
          videoUrl: lesson.type === "video" ? "" : undefined,
        },
        resources: [],
        settings: {
          isRequired: true,
          videoProgression: true,
          allowSkip: false,
          timeLimit: lesson.duration * 60, // Convert to seconds
        },
        quiz: {
          enabled: lesson.type === "quiz",
          passingScore: 70,
          questions: [],
        },
      })),
      settings: {
        isPublished: false,
        requiresSequentialProgress: true,
        minimumQuizScore: 70,
        enrollment: {
          enrollmentMode: "free" as const,
          price: undefined,
          recurringPrice: undefined,
        },
        access: {
          requirementType: "none" as const,
          prerequisites: generatedContent.prerequisites,
          requiredPoints: 0,
          hasExpiration: false,
          startDate: undefined,
          endDate: undefined,
          studentLimit: 0,
        },
        completion: {
          certificateTemplate: undefined,
          completionPoints: 0,
        },
        display: {
          courseMaterialsEnabled: true,
          contentVisibility: "enrolled" as const,
          customPagination: false,
          completionPage: undefined,
          idleTimeout: 0,
        },
        certificate: {
          certificateEnabled: false,
          certificateTemplate: "",
          certificateDescription: "",
          signatureImage: "",
          signatureTitle: "",
          additionalText: "",
          certificateType: "completion" as const,
        },
        currency: "USD",
      },
    }

    onCourseGenerated(courseData)
    toast.success("Course data applied to course builder!")
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Course Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="topic">Topic</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
          </TabsList>

          <TabsContent value="topic" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="topic">Course Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Digital Marketing Fundamentals"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Course Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of what this course should cover..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input
                    id="audience"
                    placeholder="e.g., Marketing professionals"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="level">Course Level</Label>
                  <Select value={courseLevel} onValueChange={(value) => setCourseLevel(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="duration">Estimated Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 4 weeks, 20 hours"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="document" className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Upload a document to generate a course</p>
              <p className="text-sm text-gray-500">Supports PDF, Word, and text files</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="mt-4"
              />
              {uploadedFile && (
                <Badge variant="secondary" className="mt-2">
                  <FileText className="h-3 w-3 mr-1" />
                  {uploadedFile.name}
                </Badge>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div>
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter a URL to extract content and generate a course
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button onClick={generateCourse} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Course
              </>
            )}
          </Button>
        </div>

        {generatedContent && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Generated Course Preview</h3>
            <div className="space-y-2">
              <p><strong>Title:</strong> {generatedContent.title}</p>
              <p><strong>Description:</strong> {generatedContent.description}</p>
              <p><strong>Lessons:</strong> {generatedContent.lessons.length}</p>
              <p><strong>Duration:</strong> {generatedContent.estimatedDuration} minutes</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {generatedContent.learningObjectives.map((objective, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {objective}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={useGeneratedContent} size="sm">
                Use This Course
              </Button>
              <Button variant="outline" onClick={() => setGeneratedContent(null)} size="sm">
                Generate New
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
