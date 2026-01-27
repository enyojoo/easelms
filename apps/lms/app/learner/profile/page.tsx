"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import { Award, Upload, Bell, Shield, Globe, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import ProfileSkeleton from "@/components/ProfileSkeleton"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CertificatePreview from "@/components/CertificatePreview"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { US } from "country-flag-icons/react/3x2"
import { useProfile, useUpdateProfile, useSettings } from "@/lib/react-query/hooks"
import { useRealtimeProfile } from "@/lib/react-query/hooks/useRealtime"
import { toast } from "sonner"

const NigeriaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3" className="w-4 h-4 mr-2">
    <rect width="6" height="3" fill="#008751" />
    <rect width="2" height="3" x="2" fill="#ffffff" />
  </svg>
)

export default function LearnerProfilePage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading, userType } = useClientAuthState()
  const [isEditing, setIsEditing] = useState(false)
  const [certificates, setCertificates] = useState<any[]>([])
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  const tabsListRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [settings, setSettings] = useState({
    emailNotifications: true,
  })
  const [newPassword, setNewPassword] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("USD")

  // Use React Query hooks for data fetching
  const { data: profileData, isPending: profilePending } = useProfile()
  const { data: settingsData } = useSettings()
  const updateProfileMutation = useUpdateProfile()

  // Set up real-time subscription for profile changes
  // This ensures profile data stays in sync across tabs and devices
  useRealtimeProfile(authUser?.id)

  const profile = profileData?.profile

  useEffect(() => {
    if (!authLoading) {
      if (!authUser || userType !== "user") {
        router.push("/auth/learner/login")
        return
      }
    }
  }, [authLoading, authUser, userType, router])

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        bio: profile.bio || "",
      })
      setSelectedCurrency(profile.currency || "USD")
      setImageError(false)
    }
  }, [profile])

  // Load settings from React Query cache
  useEffect(() => {
    if (settingsData?.userSettings) {
      setSettings({
        emailNotifications: settingsData.userSettings.email_notifications ?? true,
      })
      setSelectedCurrency(settingsData.userSettings.currency || profile?.currency || "USD")
    }
  }, [settingsData, profile])

  // Load certificates (no hook exists yet, so keep manual fetch)
  useEffect(() => {
    const loadCertificates = async () => {
      if (!authUser) return

      try {
        const certificatesResponse = await fetch("/api/certificates")
        if (certificatesResponse.ok) {
          const certificatesData = await certificatesResponse.json()
          setCertificates(certificatesData.certificates || [])
        } else {
          setCertificates([])
        }
      } catch (error) {
        console.error("Error loading certificates:", error)
        setCertificates([])
      }
    }

    if (authUser) {
      loadCertificates()
    }
  }, [authUser])

  // Check scroll position for tabs arrows
  useEffect(() => {
    const checkScrollPosition = () => {
      const tabsList = tabsListRef.current
      if (!tabsList) return

      const { scrollLeft, scrollWidth, clientWidth } = tabsList
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1) // -1 for rounding
    }

    const tabsList = tabsListRef.current
    if (!tabsList) return

    // Check on mount and resize
    checkScrollPosition()
    tabsList.addEventListener("scroll", checkScrollPosition)
    window.addEventListener("resize", checkScrollPosition)

    // Use ResizeObserver to detect content changes
    const resizeObserver = new ResizeObserver(checkScrollPosition)
    resizeObserver.observe(tabsList)

    return () => {
      tabsList.removeEventListener("scroll", checkScrollPosition)
      window.removeEventListener("resize", checkScrollPosition)
      resizeObserver.disconnect()
    }
  }, [])



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name,
        bio: formData.bio,
      })
      toast.success("Profile updated successfully")
      setIsEditing(false)
      // Dispatch event to refresh header
      window.dispatchEvent(new CustomEvent("profileUpdated"))
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast.error(error?.message || "Failed to update profile. Please try again.")
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB")
      return
    }

    try {
      setUploadingImage(true)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "avatar")
      // Let the API determine the bucket from type

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload image")
      }

      const data = await response.json()

      // Update profile with new image URL
      const updateResponse = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_image: data.url,
        }),
      })

      if (updateResponse.ok) {
        toast.success("Profile picture updated successfully")
        // Reset image error state when new image is uploaded
        setImageError(false)
        // Invalidate profile cache to refresh
        updateProfileMutation.mutate({ profile_image: data.url })
        
        // Dispatch event to refresh header
        window.dispatchEvent(new CustomEvent("profileUpdated"))
      } else {
        const errorData = await updateResponse.json()
        throw new Error(errorData.error || "Failed to update profile with new image")
      }
    } catch (error: any) {
      console.error("Error uploading image:", error)
      toast.error(error.message || "Failed to upload image")
    } finally {
      setUploadingImage(false)
      // Reset file input
      e.target.value = ""
    }
  }

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  const hasData = !!profile
  const showSkeleton = (authLoading || !authUser || userType !== "user" || profilePending) && !hasData

  return (
    <div className="pt-4 md:pt-8 pb-[30px] md:pb-8 px-4 md:px-6 lg:px-8">
      {showSkeleton ? (
        <ProfileSkeleton />
      ) : (
        <>
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-8">Profile</h1>
      <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
        <div className="relative">
          {/* Left Arrow - Mobile Only */}
          {showLeftArrow && (
            <button
              onClick={() => {
                const tabsList = tabsListRef.current
                if (tabsList) {
                  tabsList.scrollBy({ left: -200, behavior: "smooth" })
                }
              }}
              className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-r from-background to-transparent sm:hidden"
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
          )}

          {/* Right Arrow - Mobile Only */}
          {showRightArrow && (
            <button
              onClick={() => {
                const tabsList = tabsListRef.current
                if (tabsList) {
                  tabsList.scrollBy({ left: 200, behavior: "smooth" })
                }
              }}
              className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-l from-background to-transparent sm:hidden"
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          )}

          <TabsList 
            ref={tabsListRef}
            className="w-full overflow-x-auto flex-nowrap justify-start sm:justify-center touch-pan-x scrollbar-hide bg-muted p-1 h-auto min-h-[44px] sm:min-h-[48px]"
          >
            <TabsTrigger 
              value="profile" 
              className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-5 h-10 sm:h-11 md:h-12 whitespace-nowrap"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="certificates" 
              className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-5 h-10 sm:h-11 md:h-12 whitespace-nowrap"
            >
              Certificates
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex-shrink-0 text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-5 h-10 sm:h-11 md:h-12 whitespace-nowrap"
            >
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

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
                    disabled={true}
                    className="mt-1.5 md:mt-2 bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
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
                    <Button type="submit" className="w-full sm:w-auto min-h-[44px]" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
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
            <div className="w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] rounded-full overflow-hidden mb-4 bg-muted relative">
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              {profile?.profile_image && profile.profile_image.trim() !== "" && !imageError ? (
                <Image
                  src={profile.profile_image}
                  alt={profile.name || "Profile"}
                  width={150}
                  height={150}
                  className="object-cover w-full h-full"
                  onError={() => {
                    setImageError(true)
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-primary text-primary-foreground text-4xl sm:text-5xl font-semibold">
                  {(profile?.name && profile.name.trim() ? profile.name.charAt(0).toUpperCase() : profile?.email?.charAt(0).toUpperCase()) || "U"}
                </div>
              )}
            </div>
            <div>
              <input
                id="profile-image-upload-learner"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
              <Button
                type="button"
                onClick={() => document.getElementById("profile-image-upload-learner")?.click()}
                disabled={uploadingImage}
                className="w-full sm:w-auto min-h-[44px]"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingImage ? "Uploading..." : "Change Picture"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Max size: 5MB</p>
          </CardContent>
        </Card>
          </div>
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
                      learnerName={profile?.name || "Student"}
                      completionDate={new Date(cert.issuedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      certificateId={cert.certificateNumber}
                      onDownload={async () => {
                        try {
                          const response = await fetch(`/api/certificates/${cert.id}/download`)
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}))
                            throw new Error(errorData.error || "Failed to download certificate")
                          }
                          const blob = await response.blob()
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = `certificate-${cert.courseTitle || "course"}.pdf`
                          document.body.appendChild(a)
                          a.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(a)
                          toast.success("Certificate downloaded successfully")
                        } catch (error: any) {
                          toast.error(error.message || "Failed to download certificate")
                        }
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

        <TabsContent value="settings" className="mt-4 md:mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <Bell className="mr-2 h-5 w-5 flex-shrink-0" /> Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <Label htmlFor="email-notifications" className="text-sm md:text-base">Email Notifications</Label>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Receive email updates about your courses and account
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={async (checked) => {
                      setSettings((prev) => ({ ...prev, emailNotifications: checked }))
                      // Save to settings API
                      try {
                        const response = await fetch("/api/settings", {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            userSettings: {
                              email_notifications: checked,
                            },
                          }),
                        })
                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({}))
                          throw new Error(errorData.error || "Failed to save notification settings")
                        }
                        toast.success("Notification settings updated")
                      } catch (error: any) {
                        console.error("Error saving notification settings:", error)
                        toast.error(error?.message || "Failed to save notification settings")
                      }
                    }}
                    className="flex-shrink-0 sm:ml-4"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <Globe className="mr-2 h-5 w-5 flex-shrink-0" /> Display Currency
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Select value={selectedCurrency} onValueChange={async (currency) => {
                    setSelectedCurrency(currency)
                    // Save currency preference to user profile
                    try {
                      const response = await fetch("/api/profile", {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ currency }),
                      })
                      if (response.ok) {
                        toast.success("Currency preference updated")
                        // Invalidate profile cache to refresh
                        updateProfileMutation.mutate({ currency })
                        window.dispatchEvent(new CustomEvent("profileUpdated"))
                      } else {
                        const errorData = await response.json().catch(() => ({}))
                        throw new Error(errorData.error || "Failed to update currency")
                      }
                    } catch (error: any) {
                      console.error("Error updating currency:", error)
                      toast.error(error?.message || "Failed to update currency preference")
                    }
                  }}>
                    <SelectTrigger className="w-full min-h-[44px]">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">
                        <div className="flex items-center">
                          <US className="w-4 h-4 mr-2 flex-shrink-0" />
                          USD - US Dollar
                        </div>
                      </SelectItem>
                      <SelectItem value="NGN">
                        <div className="flex items-center">
                          <NigeriaFlag />
                          NGN - Nigerian Naira
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    This currency will be used to display prices for courses.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <Shield className="mr-2 h-5 w-5 flex-shrink-0" /> Security
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm md:text-base">Change Password</Label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-grow min-h-[44px]"
                    />
                    <Button 
                      onClick={async () => {
                        if (!newPassword || newPassword.length < 8) {
                          toast.error("Password must be at least 8 characters long")
                          return
                        }
                        try {
                          const response = await fetch("/api/profile", {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ password: newPassword }),
                          })
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}))
                            throw new Error(errorData.error || "Failed to update password")
                          }
                          toast.success("Password updated successfully")
                          setNewPassword("")
                        } catch (error: any) {
                          toast.error(error?.message || "Failed to update password")
                        }
                      }} 
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-lg md:text-xl">Delete Account</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="flex flex-col gap-4 bg-destructive/10 p-4 md:p-5 rounded-lg">
                  <div className="space-y-1.5">
                    <p className="font-medium text-sm md:text-base">Permanently delete your account</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Once deleted, your account cannot be recovered</p>
                  </div>
                  <Button variant="destructive" className="w-full sm:w-auto min-h-[44px] self-start sm:self-auto">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  )
}
