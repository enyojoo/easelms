"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import {
  Bell,
  Users,
  UserCog,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TeamManagement from "./components/TeamManagement"
import UserManagement from "./components/UserManagement"



export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    courseEnrollmentNotifications: true,
    courseCompletionNotifications: true,
    platformAnnouncements: true,
    userEmailNotifications: true,
  })

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "admin") {
      router.push("/auth/admin/login")
    } else {
      setUser(user)
    }
  }, [router])

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: checked }))
  }


  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="pt-4 md:pt-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Settings</h1>
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg w-full grid grid-cols-3 gap-2">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span>Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" /> Platform Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="course-enrollment-notifications">Course Enrollment Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send email notifications when users enroll in courses
                        </p>
                      </div>
                      <Switch
                        id="course-enrollment-notifications"
                        checked={settings.courseEnrollmentNotifications}
                        onCheckedChange={handleSwitchChange("courseEnrollmentNotifications")}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="course-completion-notifications">Course Completion Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send email notifications when users complete courses
                        </p>
                      </div>
                      <Switch
                        id="course-completion-notifications"
                        checked={settings.courseCompletionNotifications}
                        onCheckedChange={handleSwitchChange("courseCompletionNotifications")}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="platform-announcements">Platform Announcements</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable sending platform-wide announcements to all users
                        </p>
                      </div>
                      <Switch
                        id="platform-announcements"
                        checked={settings.platformAnnouncements}
                        onCheckedChange={handleSwitchChange("platformAnnouncements")}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="user-email-notifications">User Email Notifications (Default)</Label>
                        <p className="text-sm text-muted-foreground">
                          Default email notification preference for new users. Users can change this in their settings.
                        </p>
                      </div>
                      <Switch
                        id="user-email-notifications"
                        checked={settings.userEmailNotifications}
                        onCheckedChange={handleSwitchChange("userEmailNotifications")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}
