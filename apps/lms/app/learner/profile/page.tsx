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
import type { User } from "@/data/users"
import { Globe, Twitter, Linkedin, Youtube, Instagram, TwitterIcon as TikTok, Loader2, Award, BookOpen, CheckCircle2 } from "lucide-react"
import { modules } from "@/data/courses"
import { getCertificatesByUser } from "@/data/certificates"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CertificatePreview from "@/components/CertificatePreview"

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
    website: "",
    twitter: "",
    linkedin: "",
    youtube: "",
    instagram: "",
    tiktok: "",
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
        website: user.website || "",
        twitter: user.twitter || "",
        linkedin: user.linkedin || "",
        youtube: user.youtube || "",
        instagram: user.instagram || "",
        tiktok: user.tiktok || "",
      })
      
      // Load enrolled and completed courses
      const enrolled = modules.filter((course) => user.enrolledCourses?.includes(course.id))
      const completed = modules.filter((course) => user.completedCourses?.includes(course.id))
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
                <div className="space-y-4">
                  <Label>Social Media Links</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-5 h-5" />
                      <Input
                        name="website"
                        placeholder="Website URL"
                        value={formData.website}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Twitter className="w-5 h-5" />
                      <Input
                        name="twitter"
                        placeholder="Twitter handle"
                        value={formData.twitter}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Linkedin className="w-5 h-5" />
                      <Input
                        name="linkedin"
                        placeholder="LinkedIn URL"
                        value={formData.linkedin}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Youtube className="w-5 h-5" />
                      <Input
                        name="youtube"
                        placeholder="YouTube channel"
                        value={formData.youtube}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Instagram className="w-5 h-5" />
                      <Input
                        name="instagram"
                        placeholder="Instagram handle"
                        value={formData.instagram}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <TikTok className="w-5 h-5" />
                      <Input
                        name="tiktok"
                        placeholder="TikTok handle"
                        value={formData.tiktok}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Enrolled Courses ({enrolledCourses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrolledCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {enrolledCourses.map((course) => (
                      <Link key={course.id} href={`/learner/courses/${course.id}`}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <h3 className="font-semibold mb-2 line-clamp-2">{course.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{course.lessons.length} lessons</span>
                              <Button variant="ghost" size="sm">Continue Learning</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>You haven't enrolled in any courses yet.</p>
                    <Link href="/learner/courses">
                      <Button className="mt-4">Browse Courses</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Completed Courses ({completedCourses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedCourses.map((course) => (
                      <Link key={course.id} href={`/learner/courses/${course.id}/learn/summary`}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200 dark:border-green-800">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold line-clamp-2 flex-1">{course.title}</h3>
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{course.lessons.length} lessons</span>
                              <Button variant="ghost" size="sm">View Certificate</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>You haven't completed any courses yet.</p>
                    <Link href="/learner/courses">
                      <Button className="mt-4">Start Learning</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
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
