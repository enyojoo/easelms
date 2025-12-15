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

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
  })

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "admin") {
      router.push("/auth/admin/login")
    } else {
      setUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        bio:
          user.bio ||
          "I use my voice in reaching the voiceless and passionately share God's transformative word with those seeking to discover their purpose in life and launch them into their destiny​​",
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
                style={{ objectPosition: "center 20%" }}
              />
            </div>
            <Button>Change Picture</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
