"use client"

import { useState } from "react"
import { notFound, useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlayCircle, FileText, Award, Clock, Globe, Link, Users } from "lucide-react"
import VideoModal from "@/components/VideoModal"
import { modules } from "@/data/courses"
import { users } from "@/data/users"
import { Twitter, Linkedin, Youtube, Instagram, LinkIcon as Website } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BrainCircuit } from "lucide-react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Edit } from "lucide-react"

const courseImages: Record<string, string> = {
  "Digital Marketing & Social Media":
    "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1474&q=80",
  "Startup Fundamentals":
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  "Basic Money Management":
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1511&q=80",
  "Public Speaking & Communication":
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  "Building Side Hustles":
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
  "Tech Skills (No-code, AI Basics)":
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
}

export default function InstructorCoursePreviewPage() {
  const params = useParams()
  const id = params.id as string
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const module = modules.find((m) => m.id === Number.parseInt(id))
  const router = useRouter()

  if (!module) {
    notFound()
  }

  // Instructor information
  const instructor = {
    name: "Dr Ifeoma Eze",
    bio: "I use my voice in reaching the voiceless and passionately share God's transformative word with those seeking to discover their purpose in life and launch them into their destiny​​",
    profileImage: "https://www.pastorifeomaeze.com/wp-content/uploads/2020/01/Ifeoma-Eze.jpeg",
  }

  // Determine course access type based on module ID (simulating different course types)
  const accessType = ["free", "buy", "subscribe", "request"][module.id % 4]

  const getAccessDetails = () => {
    switch (accessType) {
      case "free":
        return {
          price: "Free",
          buttonText: "Start Free Course",
          access: "Full lifetime access",
        }
      case "buy":
        return {
          price: "$49",
          buttonText: "Buy Course",
          access: "Full lifetime access",
        }
      case "subscribe":
        return {
          price: "$20/mo",
          buttonText: "Subscribe",
          access: "Access while subscribed",
        }
      case "request":
        return {
          price: "Contact for pricing",
          buttonText: "Request Access",
          access: "Full lifetime access",
        }
      default:
        return {
          price: "Price not set",
          buttonText: "Enroll Now",
          access: "Full lifetime access",
        }
    }
  }

  const { price, buttonText, access } = getAccessDetails()

  return (
    <div className=" pt-4 md:pt-8">
      <h1 className="text-4xl font-bold mb-6 text-primary">{module.title}</h1>

      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => router.push("/admin/courses")} className="flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
        <Button onClick={() => router.push(`/admin/courses/new?edit=${module.id}`)} className="flex items-center">
          <Edit className="w-4 h-4 mr-2" />
          Edit Course
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {/* Course Overview Section */}
          <Card className="mb-4">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary">Course Overview</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">{module.description}</p>
              <div className="flex items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{module.lessons.length} lessons</span>
                  <span>•</span>
                  <span>4 hours</span>
                  <span>•</span>
                  <span>{module.enrolledStudents || 0} students</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary">Course Content</h2>
              <div className="bg-muted p-4 rounded-lg mb-4">
                <p className="font-semibold">{module.lessons.length} lessons • 4 hours total length</p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {module.lessons.map((lesson, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <PlayCircle className="w-5 h-5 mr-2 text-primary" />
                          <span className="font-medium">{lesson.title}</span>
                        </div>
                        {/* Time removed */}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {/* Quiz section */}
                        <div className="flex items-center justify-between py-2 pl-7">
                          <div className="flex items-center">
                            <BrainCircuit className="w-4 h-4 mr-2 text-primary" />
                            <span className="text-sm">Quiz {index + 1}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {lesson.quiz?.questions.length || 4} questions
                          </span>
                        </div>

                        {/* Resources */}
                        {lesson.resources?.map((resource, rIndex) => (
                          <div key={rIndex} className="flex items-center justify-between py-2 pl-7">
                            <div className="flex items-center">
                              {resource.type === "document" ? (
                                <FileText className="w-4 h-4 mr-2 text-primary" />
                              ) : (
                                <Link className="w-4 h-4 mr-2 text-primary" />
                              )}
                              <span className="text-sm">{resource.title}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
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

          <Card className="mb-4">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary">Who this course is for:</h2>
              {module.whoIsThisFor ? (
                <p className="text-muted-foreground leading-relaxed">{module.whoIsThisFor}</p>
              ) : (
                <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                  <li>Individuals seeking personal and spiritual growth</li>
                  <li>Those looking to discover their purpose and calling</li>
                  <li>Anyone desiring to deepen their relationship with God</li>
                  <li>People ready to transform their lives and impact others</li>
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary">Requirements</h2>
              {module.requirements ? (
                <p className="text-muted-foreground leading-relaxed">{module.requirements}</p>
              ) : (
                <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                  <li>Open heart and willingness to learn</li>
                  <li>Desire for personal and spiritual growth</li>
                  <li>Commitment to complete the course materials</li>
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Instructor Profile Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <Image
                  src={instructor.profileImage}
                  alt={instructor.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div>
                  <h2 className="text-2xl font-bold text-primary">{instructor.name}</h2>
                  <p className="text-muted-foreground">Course Instructor</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {instructor.bio}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-primary/20 h-fit">
            <CardContent className="p-6">
              <div
                className="relative aspect-video mb-4 rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setIsVideoModalOpen(true)}
              >
                <Image
                  src={courseImages[module.title] || module.image}
                  alt={module.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                  <PlayCircle className="w-16 h-16 text-white opacity-90 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="mt-4 mb-4">
                <span className="text-3xl font-bold text-primary">{price}</span>
                {accessType === "subscribe" && <span className="text-sm text-muted-foreground">/month</span>}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                This is a preview. Students will see an active enrollment button here.
              </p>
              <Button className="w-full mb-4 bg-muted text-muted-foreground cursor-not-allowed" disabled>
                {buttonText}
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
        title={module.title}
      />
    </div>
  )
}
