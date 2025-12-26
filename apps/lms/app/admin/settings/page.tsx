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
  DollarSign,
  Loader2,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TeamManagement from "./components/TeamManagement"
import UserManagement from "./components/UserManagement"
import { US } from "country-flag-icons/react/3x2"
import AdminSettingsSkeleton from "@/components/AdminSettingsSkeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const NigeriaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3" className="w-4 h-4 mr-2">
    <rect width="6" height="3" fill="#008751" />
    <rect width="2" height="3" x="2" fill="#ffffff" />
  </svg>
)



export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    courseEnrollmentNotifications: true,
    courseCompletionNotifications: true,
    platformAnnouncements: true,
    userEmailNotifications: true,
    defaultCurrency: "USD",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track mount state to prevent flash of content
  useEffect(() => {
    setMounted(true)
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "admin") {
      router.push("/auth/admin/login")
    } else {
      setUser(user)
    }
  }, [router])

  // Fetch platform settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!mounted || !user) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/settings")
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to fetch settings")
        }

        const data = await response.json()
        const platformSettings = data.platformSettings

        if (platformSettings) {
          setSettings({
            defaultCurrency: platformSettings.default_currency || "USD",
            courseEnrollmentNotifications: platformSettings.course_enrollment_notifications ?? true,
            courseCompletionNotifications: platformSettings.course_completion_notifications ?? true,
            platformAnnouncements: platformSettings.platform_announcements ?? true,
            userEmailNotifications: platformSettings.user_email_notifications ?? true,
            emailNotifications: true, // Keep for compatibility
          })
        }
      } catch (err: any) {
        console.error("Error fetching settings:", err)
        setError(err.message || "Failed to load settings")
        toast.error(err.message || "Failed to load settings")
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [mounted, user])

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSaveSettings = async () => {
    if (!user) return

    try {
      setSaving(true)
      setError(null)

      const platformSettings = {
        default_currency: settings.defaultCurrency,
        course_enrollment_notifications: settings.courseEnrollmentNotifications,
        course_completion_notifications: settings.courseCompletionNotifications,
        platform_announcements: settings.platformAnnouncements,
        user_email_notifications: settings.userEmailNotifications,
      }

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platformSettings,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save settings")
      }

      toast.success("Settings saved successfully!")
    } catch (err: any) {
      console.error("Error saving settings:", err)
      setError(err.message || "Failed to save settings")
      toast.error(err.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  // Always render page structure, show skeleton for content if loading
  const isLoading = !mounted || !user || loading

  return (
    <div className="pt-4 md:pt-8">
      {isLoading ? (
        <AdminSettingsSkeleton />
      ) : (
        <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Settings</h1>
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg w-full grid grid-cols-3 gap-2">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>Platform Settings</span>
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
                  {error && (
                    <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                  <div className="space-y-6">
                    {/* Default Currency Setting */}
                    <div className="space-y-2 pb-6 border-b">
                      <Label className="text-base font-semibold flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" /> Default Currency
                      </Label>
                      <Select
                        value={settings.defaultCurrency}
                        onValueChange={(value) => setSettings((prev) => ({ ...prev, defaultCurrency: value }))}
                        disabled={saving}
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
                          disabled={saving}
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
                          disabled={saving}
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
                          disabled={saving}
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
                          disabled={saving}
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4 border-t">
                      <Button onClick={handleSaveSettings} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Settings"
                        )}
                      </Button>
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
        </>
      )}
    </div>
  )
}
