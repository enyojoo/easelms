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
import { Upload } from "lucide-react"
import AdminProfileSkeleton from "@/components/AdminProfileSkeleton"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
  })

  useEffect(() => {
    loadProfileData()
  }, [router])

  const loadProfileData = async () => {
    const { isLoggedIn, userType, user: authUser } = getClientAuthState()
    if (!isLoggedIn || userType !== "admin") {
      router.push("/auth/admin/login")
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Load profile data
      const profileResponse = await fetch("/api/profile")
      
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json()
        console.error("Error loading profile:", errorData.error)
        
        // Use auth user data as fallback
        if (authUser) {
          setFormData({
            name: authUser.name || "",
            email: authUser.email || "",
            bio: authUser.bio || "",
          })
          setUser(authUser)
        } else {
          setError("Failed to load profile. Please try refreshing the page.")
        }
        setLoading(false)
        return
      }

      const profileData = await profileResponse.json()

      if (profileData.profile) {
        const profile = profileData.profile
        setFormData({
          name: profile.name || "",
          email: profile.email || "",
          bio: profile.bio || "",
        })

        // Set user data for display
        setUser({
          id: profile.id,
          name: profile.name || "",
          email: profile.email || "",
          userType: "admin",
          enrolledCourses: [],
          progress: {},
          completedCourses: [],
          profileImage: profile.profile_image || "",
          bio: profile.bio || "",
        })
        // Reset image error when profile loads
        setImageError(false)
      } else if (authUser) {
        // Fallback to auth user if profile is empty
        setFormData({
          name: authUser.name || "",
          email: authUser.email || "",
          bio: authUser.bio || "",
        })
        setUser(authUser)
      }
    } catch (error) {
      console.error("Error loading profile data:", error)
      setError("An error occurred while loading your profile.")
      
      // Use auth user as fallback
      if (authUser) {
        setFormData({
          name: authUser.name || "",
          email: authUser.email || "",
          bio: authUser.bio || "",
        })
        setUser(authUser)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          bio: formData.bio,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        // Reload profile data to reflect changes
        await loadProfileData()
        
        // Dispatch event to refresh header
        window.dispatchEvent(new CustomEvent("profileUpdated"))
      } else {
        console.error("Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    try {
      setUploadingImage(true)
      setError(null)

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
        // Reset image error state when new image is uploaded
        setImageError(false)
        // Reload profile data to show new image
        await loadProfileData()
        
        // Dispatch event to refresh header
        window.dispatchEvent(new CustomEvent("profileUpdated"))
      } else {
        const errorData = await updateResponse.json()
        throw new Error(errorData.error || "Failed to update profile with new image")
      }
    } catch (error: any) {
      console.error("Error uploading image:", error)
      setError(error.message || "Failed to upload image")
    } finally {
      setUploadingImage(false)
      // Reset file input
      e.target.value = ""
    }
  }

  if (loading) {
    return <AdminProfileSkeleton />
  }

  if (!user) {
    return (
      <div className="pt-4 md:pt-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">
              {error || "Failed to load profile. Please try refreshing the page."}
            </p>
            <Button onClick={() => loadProfileData()}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className=" pt-4 md:pt-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Profile</h1>
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
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
                    disabled={true}
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
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
            <div className="w-[150px] h-[150px] rounded-full overflow-hidden mb-4 bg-muted relative">
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              {user.profileImage && user.profileImage.trim() !== "" && !imageError ? (
                <Image
                  src={user.profileImage}
                  alt={user.name || "Profile"}
                  width={150}
                  height={150}
                  className="object-cover w-full h-full"
                  style={{ objectPosition: "center 20%" }}
                  onError={() => {
                    setImageError(true)
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-primary text-primary-foreground text-5xl font-semibold">
                  {(user.name && user.name.trim() ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()) || "U"}
                </div>
              )}
            </div>
            <div>
              <input
                id="profile-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
              <Button
                type="button"
                onClick={() => document.getElementById("profile-image-upload")?.click()}
                disabled={uploadingImage}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingImage ? "Uploading..." : "Change Picture"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Max size: 5MB</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
