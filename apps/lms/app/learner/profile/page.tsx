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
import { Globe, Twitter, Linkedin, Youtube, Instagram, TwitterIcon as TikTok } from "lucide-react"

export default function LearnerProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
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
    return <div>Loading...</div>
  }

  return (
    <div className=" pt-4 md:pt-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Profile</h1>
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
    </div>
  )
}
