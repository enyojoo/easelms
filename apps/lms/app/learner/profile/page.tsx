"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getClientAuthState } from "@/utils/client-auth"
import { getEnrolledCourseIds } from "@/utils/enrollment"
import type { User } from "@/data/users"
import { Loader2, Award, BookOpen, CheckCircle2 } from "lucide-react"
import { modules } from "@/data/courses"
import { getCertificatesByUser } from "@/data/certificates"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CertificatePreview from "@/components/CertificatePreview"
import CourseCard from "@/components/CourseCard"

export default function LearnerProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([])
  const [completedCourses, setCompletedCourses] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
  })

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/learner/login")
    } else {
      setUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        bio: user.bio || "",
      })
      
      // Get enrolled course IDs from both user object and localStorage
      const enrolledCourseIds = getEnrolledCourseIds(user) || user.enrolledCourses || []
      const completedCourseIds = user.completedCourses || []
      
      // Load enrolled and completed courses
      let enrolled = modules.filter((course) => enrolledCourseIds.includes(course.id))
      let completed = modules.filter((course) => completedCourseIds.includes(course.id))
      
      // Add some dummy courses if user has no enrolled courses (for demo purposes)
      if (enrolled.length === 0 && modules.length > 0) {
        // Add first 2 courses as dummy enrolled courses (for UI demonstration)
        const dummyEnrolled = modules.slice(0, 2).filter((course) => !completedCourseIds.includes(course.id))
        enrolled = dummyEnrolled
      }
      
      // Add dummy completed course if none exist (for demo purposes)
      if (completed.length === 0 && modules.length > 2) {
        // Use a course that's not in enrolled list as dummy completed course
        const availableForCompletion = modules.filter(
          (course) => !enrolledCourseIds.includes(course.id) && course.id !== enrolled[0]?.id && course.id !== enrolled[1]?.id
        )
        if (availableForCompletion.length > 0) {
          completed = [availableForCompletion[0]]
        }
      }
      
      setEnrolledCourses(enrolled)
      setCompletedCourses(completed)
      
      // Load certificates
      const userCertificates = getCertificatesByUser(user.id?.toString() || "")
      setCertificates(userCertificates)
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Updated profile:", formData)
    setIsEditing(false)
    setUser((prev) => (prev ? { ...prev, ...formData } : null))
  }

  if (!user) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4 md:pt-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Profile</h1>
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={6}
                    placeholder="Tell us about yourself..."
                  />
                </div>
                {isEditing ? (
                  <div className="flex justify-end space-x-2">
                    <Button type="submit">Save Changes</Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-[150px] h-[150px] rounded-full overflow-hidden mb-4">
              <Image
                src={user.profileImage}
                alt={user.name}
                width={500}
                height={500}
                className="object-cover w-full h-full"
              />
            </div>
            <Button>Change Picture</Button>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <div className="space-y-8">
            {/* Enrolled Courses Section */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Enrolled Courses</h2>
                <span className="text-muted-foreground">({enrolledCourses.length})</span>
              </div>
              {enrolledCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {enrolledCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      status="enrolled"
                      enrolledCourseIds={getEnrolledCourseIds(user) || user?.enrolledCourses || []}
                      completedCourseIds={user?.completedCourses || []}
                      userProgress={user?.progress || {}}
                      showProgress={true}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Enrolled Courses</h3>
                    <p className="text-muted-foreground mb-6">Start your learning journey by enrolling in a course.</p>
                    <Link href="/learner/courses">
                      <Button>Browse Courses</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Completed Courses Section */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <h2 className="text-2xl font-bold">Completed Courses</h2>
                <span className="text-muted-foreground">({completedCourses.length})</span>
              </div>
              {completedCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      status="completed"
                      enrolledCourseIds={getEnrolledCourseIds(user) || user?.enrolledCourses || []}
                      completedCourseIds={user?.completedCourses || []}
                      userProgress={user?.progress || {}}
                      showProgress={true}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Completed Courses</h3>
                    <p className="text-muted-foreground mb-6">Complete a course to earn your first certificate!</p>
                    <Link href="/learner/courses">
                      <Button>Start Learning</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certificates ({certificates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {certificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {certificates.map((cert) => (
                    <CertificatePreview
                      key={cert.id}
                      courseTitle={cert.courseTitle}
                      learnerName={user.name || "Student"}
                      completionDate={new Date(cert.issuedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      certificateId={cert.certificateNumber}
                      onDownload={() => {
                        console.log("Downloading certificate:", cert.certificateNumber)
                        alert("Certificate download started!")
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You don't have any certificates yet.</p>
                  <p className="text-sm mt-2">Complete a course to earn your first certificate!</p>
                  <Link href="/learner/courses">
                    <Button className="mt-4">Browse Courses</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
