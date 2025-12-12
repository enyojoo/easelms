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
import { ArrowLeft } from "lucide-react"

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

export default function CoursePage() {
  const params = useParams()
  const id = params.id as string
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const module = modules.find((m) => m.id === Number.parseInt(id))
  const router = useRouter()

  if (!module) {
    notFound()
  }

  // Find the instructor (assuming it's the first instructor user)
  const instructor = users.find((user) => user.email === "admin@example.com")

  if (!instructor) {
    return <div>Instructor not found</div>
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

  const handleStartCourse = () => {
    router.push(`/learner/courses/${id}/learn`)
  }

  return (
    <div className=" pt-4 md:pt-8">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-primary">{module.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <p className="text-muted-foreground mb-6 text-gray-600">{module.description}</p>

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
              <h2 className="text-2xl font-bold mb-4 text-primary">Requirements</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                <li>No prior business knowledge required</li>
                <li>Basic computer skills</li>
                <li>Enthusiasm to learn and apply new concepts</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary">Description</h2>
              <p className="text-muted-foreground mb-4">
                This Mini-MBA for Teens module on {module.title} is designed to give young entrepreneurs a comprehensive
                understanding of key business concepts. Through engaging lessons and practical exercises, students will
                develop skills that are crucial in today's fast-paced business world.
              </p>
              <p className="text-muted-foreground mb-4">
                Whether you're interested in starting your own business, improving your financial literacy, or
                developing essential communication skills, this course provides the foundation you need to succeed.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-primary">Who this course is for:</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                <li>Teens interested in entrepreneurship and business</li>
                <li>Young adults looking to develop practical business skills</li>
                <li>Students who want to get a head start in their business education</li>
                <li>Anyone between 13-19 years old with a passion for learning</li>
              </ul>
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
              <p className="text-sm text-muted-foreground mb-4">
                Passionate educator with over 10 years of experience in teaching business and entrepreneurship to young
                minds. Specializing in practical, hands-on learning experiences that prepare students for the real world
                of business.
              </p>
              <div className="flex space-x-2">
                {instructor.website && (
                  <a
                    href={instructor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Website className="w-5 h-5" />
                  </a>
                )}
                {instructor.twitter && (
                  <a
                    href={`https://twitter.com/${instructor.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {instructor.linkedin && (
                  <a
                    href={instructor.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {instructor.youtube && (
                  <a
                    href={instructor.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {instructor.instagram && (
                  <a
                    href={`https://instagram.com/${instructor.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
              </div>
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
                  src={courseImages[module.title] || module.image} // Use courseImages if available, fallback to module.image
                  alt={module.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                  <PlayCircle className="w-16 h-16 text-white opacity-90 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="mt-4 mb-4">
                <span className="text-2xl font-bold text-primary">{price}</span>
                {accessType === "subscribe" && <span className="text-sm text-muted-foreground">/month</span>}
              </div>
              <Button
                className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleStartCourse}
              >
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
