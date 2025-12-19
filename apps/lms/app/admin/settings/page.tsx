"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import {
  Bell,
  Users,
  UserCog,
  Globe,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TeamManagement from "./components/TeamManagement"
import UserManagement from "./components/UserManagement"
import { US } from "country-flag-icons/react/3x2"

const NigeriaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3" className="w-4 h-4 mr-2">
    <rect width="6" height="3" fill="#008751" />
    <rect width="2" height="3" x="2" fill="#ffffff" />
  </svg>
)



export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    courseEnrollmentNotifications: true,
    courseCompletionNotifications: true,
    platformAnnouncements: true,
    userEmailNotifications: true,
    defaultCurrency: "USD",
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
                    <Globe className="mr-2 h-5 w-5" /> Platform Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Default Currency Setting */}
                    <div className="space-y-2 pb-6 border-b">
                      <Label className="text-base font-semibold flex items-center">
                        <Globe className="mr-2 h-4 w-4" /> Default Currency
                      </Label>
                      <Select
                        value={settings.defaultCurrency}
                        onValueChange={(value) => setSettings((prev) => ({ ...prev, defaultCurrency: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select default currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">
                            <div className="flex items-center">
                              <US className="w-4 h-4 mr-2" />
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
                      <p className="text-sm text-muted-foreground">
                        This currency will be used as the default for courses sold on the platform. Course creators can override this for individual courses.
                      </p>
                    </div>

                    {/* Notification Settings */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Bell className="mr-2 h-4 w-4" /> Notification Settings
                      </h3>
                      
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
