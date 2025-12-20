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
import { getEnrolledCourseIds, getPurchaseHistory, cancelSubscription, type Purchase } from "@/utils/enrollment"
import type { User } from "@/data/users"
import { Loader2, Award, BookOpen, CheckCircle2, ShoppingBag, XCircle, Calendar, DollarSign } from "lucide-react"
import { modules } from "@/data/courses"
import { getCertificatesByUser } from "@/data/certificates"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CertificatePreview from "@/components/CertificatePreview"
import CourseCard from "@/components/CourseCard"
import { Badge } from "@/components/ui/badge"

export default function LearnerProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([])
  const [completedCourses, setCompletedCourses] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
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
      
      // Load purchase history
      const purchaseHistory = getPurchaseHistory()
      // Add some dummy purchases if none exist (for demo purposes)
      if (purchaseHistory.length === 0 && modules.length > 0) {
        const dummyPurchases: Purchase[] = [
          {
            id: "dummy-1",
            courseId: modules[1]?.id || 2,
            courseTitle: modules[1]?.title || "Successful Marriage Course",
            type: "buy",
            amount: 99,
            currency: "USD",
            status: "active",
            purchasedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          },
          {
            id: "dummy-2",
            courseId: modules[2]?.id || 3,
            courseTitle: modules[2]?.title || "Purpose Discovery Course",
            type: "recurring",
            amount: 29,
            currency: "USD",
            recurringPrice: 29,
            status: "active",
            purchasedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
          },
        ]
        setPurchases(dummyPurchases)
      } else {
        setPurchases(purchaseHistory)
      }
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
    <div className="pt-4 md:pt-8 pb-4 md:pb-8 px-4 lg:px-6">
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-8">Profile</h1>
      <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start sm:justify-center">
          <TabsTrigger value="profile" className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4">Profile</TabsTrigger>
          <TabsTrigger value="courses" className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4">My Courses</TabsTrigger>
          <TabsTrigger value="purchases" className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4">Purchase History</TabsTrigger>
          <TabsTrigger value="certificates" className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 md:mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        <Card className="md:col-span-2">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 md:space-y-5">
                <div>
                  <Label htmlFor="name" className="text-sm md:text-base">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1.5 md:mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm md:text-base">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1.5 md:mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="bio" className="text-sm md:text-base">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={6}
                    placeholder="Tell us about yourself..."
                    className="mt-1.5 md:mt-2"
                  />
                </div>
                {isEditing ? (
                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                    <Button type="submit" className="w-full sm:w-auto min-h-[44px]">Save Changes</Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="w-full sm:w-auto min-h-[44px]">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button type="button" onClick={() => setIsEditing(true)} className="min-h-[44px]">
                    Edit Profile
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 flex flex-col items-center">
            <div className="w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] rounded-full overflow-hidden mb-4">
              <Image
                src={user.profileImage}
                alt={user.name}
                width={500}
                height={500}
                className="object-cover w-full h-full"
              />
            </div>
            <Button className="w-full sm:w-auto min-h-[44px]">Change Picture</Button>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="mt-4 md:mt-6">
          <div className="space-y-6 md:space-y-8">
            {/* Enrolled Courses Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                <h2 className="text-xl md:text-2xl font-bold">Enrolled Courses</h2>
                <span className="text-muted-foreground text-sm md:text-base">({enrolledCourses.length})</span>
              </div>
              {enrolledCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-500 flex-shrink-0" />
                <h2 className="text-xl md:text-2xl font-bold">Completed Courses</h2>
                <span className="text-muted-foreground text-sm md:text-base">({completedCourses.length})</span>
              </div>
              {completedCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

        <TabsContent value="purchases" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <ShoppingBag className="h-5 w-5 flex-shrink-0" />
                Purchase History ({purchases.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {purchases.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {purchases.map((purchase) => {
                    const course = modules.find((c) => c.id === purchase.courseId)
                    const isSubscription = purchase.type === "recurring"
                    const isActive = purchase.status === "active"
                    
                    return (
                      <Card key={purchase.id} className={!isActive ? "opacity-75" : ""}>
                        <CardContent className="p-4 md:p-6">
                          <div className="flex flex-col gap-4 md:gap-5">
                            <div className="flex-1 min-w-0">
                              <div className="mb-3">
                                <h3 className="font-semibold text-base md:text-lg mb-2 break-words">{purchase.courseTitle}</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant={isSubscription ? "secondary" : "outline"}
                                    className={
                                      isSubscription
                                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs"
                                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs"
                                    }
                                  >
                                    {isSubscription ? "Subscription" : "One-time Purchase"}
                                  </Badge>
                                  <Badge
                                    variant={isActive ? "default" : "secondary"}
                                    className={
                                      isActive
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 text-xs"
                                    }
                                  >
                                    {isActive ? "Active" : "Cancelled"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="space-y-2 text-xs md:text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                                  <span className="break-words">
                                    {purchase.currency} {purchase.amount}
                                    {isSubscription && purchase.recurringPrice && " /month"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                                  <span>
                                    Purchased: {new Date(purchase.purchasedAt).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                                {purchase.cancelledAt && (
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                                    <span>
                                      Cancelled: {new Date(purchase.cancelledAt).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 border-t">
                              {course && (
                                <Link href={`/learner/courses/${course.id}`} className="flex-1 sm:flex-initial">
                                  <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-[44px]">
                                    View Course
                                  </Button>
                                </Link>
                              )}
                              {isSubscription && isActive && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to cancel this subscription? You will be redirected to support to complete the cancellation.")) {
                                      cancelSubscription(purchase.id)
                                      setPurchases((prev) =>
                                        prev.map((p) =>
                                          p.id === purchase.id
                                            ? { ...p, status: "cancelled" as const, cancelledAt: new Date().toISOString() }
                                            : p
                                        )
                                      )
                                      router.push("/support")
                                    }
                                  }}
                                  className="w-full sm:w-auto min-h-[44px]"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Subscription
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 md:py-12 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm md:text-base mb-2">You don't have any purchases yet.</p>
                  <Link href="/learner/courses">
                    <Button className="mt-4 min-h-[44px]">Browse Courses</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Award className="h-5 w-5 flex-shrink-0" />
                Certificates ({certificates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {certificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
