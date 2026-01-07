"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import {
  Bell,
  Users,
  UserCog,
  Globe,
  DollarSign,
  Palette,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TeamManagement from "./components/TeamManagement"
import UserManagement from "./components/UserManagement"
import BrandSettings from "./components/BrandSettings"
import { US } from "country-flag-icons/react/3x2"
import AdminSettingsSkeleton from "@/components/AdminSettingsSkeleton"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useSettings, useUpdateSettings } from "@/lib/react-query/hooks"

const NigeriaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3" className="w-4 h-4 mr-2">
    <rect width="6" height="3" fill="#008751" />
    <rect width="2" height="3" x="2" fill="#ffffff" />
  </svg>
)



export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, userType } = useClientAuthState()
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    courseEnrollmentNotifications: true,
    courseCompletionNotifications: true,
    platformAnnouncements: true,
    userEmailNotifications: true,
    defaultCurrency: "USD",
  })
  const [error, setError] = useState<string | null>(null)
  const initialSettingsRef = useRef<typeof settings | null>(null)

  // Use React Query hooks for data fetching with caching
  const { data: settingsData, isPending: settingsPending, error: settingsError } = useSettings()
  const updateSettingsMutation = useUpdateSettings()

  useEffect(() => {
    if (!authLoading) {
      // Only admins can access settings page (instructors are blocked)
      if (!user || userType !== "admin") {
        router.push("/auth/admin/login")
      }
    }
  }, [user, userType, authLoading, router])

  // Pre-fetch users and team data when user is authenticated (only if not already cached)
  useEffect(() => {
    if (authLoading || !user || userType !== "admin") return
    
    // Only prefetch if data is not already cached
    const platformUsersData = queryClient.getQueryData(["platformUsers"])
    const teamMembersData = queryClient.getQueryData(["teamMembers"])
    
    if (!platformUsersData) {
      queryClient.prefetchQuery({
        queryKey: ["platformUsers"],
        queryFn: async () => {
          const response = await fetch("/api/users?userType=user")
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || "Failed to fetch users")
          }
          return response.json()
        },
      })
    }
    
    if (!teamMembersData) {
      queryClient.prefetchQuery({
        queryKey: ["teamMembers"],
        queryFn: async () => {
          const response = await fetch("/api/users?userType=admin")
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || "Failed to fetch team members")
          }
          return response.json()
        },
      })
    }
  }, [authLoading, user, userType, queryClient])

  // Process settings data from React Query
  useEffect(() => {
    if (settingsData?.platformSettings) {
      const platformSettings = settingsData.platformSettings
      const loadedSettings = {
        defaultCurrency: platformSettings.default_currency || "USD",
        courseEnrollmentNotifications: platformSettings.course_enrollment_notifications ?? true,
        courseCompletionNotifications: platformSettings.course_completion_notifications ?? true,
        platformAnnouncements: platformSettings.platform_announcements ?? true,
        userEmailNotifications: platformSettings.user_email_notifications ?? true,
        emailNotifications: true, // Keep for compatibility
      }
      setSettings(loadedSettings)
      if (!initialSettingsRef.current) {
        initialSettingsRef.current = loadedSettings // Store initial settings for comparison
      }
    }
  }, [settingsData])

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: checked }))
  }

  // Auto-save settings with debouncing (only when user actually changes settings)
  useEffect(() => {
    // Don't auto-save on initial load or if settings haven't changed
    if (!settingsData || !user || userType !== "admin" || !initialSettingsRef.current) return

    const initialSettings = initialSettingsRef.current

    // Check if settings have actually changed from initial values
    const hasChanged = 
      settings.defaultCurrency !== initialSettings.defaultCurrency ||
      settings.courseEnrollmentNotifications !== initialSettings.courseEnrollmentNotifications ||
      settings.courseCompletionNotifications !== initialSettings.courseCompletionNotifications ||
      settings.platformAnnouncements !== initialSettings.platformAnnouncements ||
      settings.userEmailNotifications !== initialSettings.userEmailNotifications

    // Only save if settings have actually changed
    if (!hasChanged) return

    // Debounce: wait 1 second after user stops changing settings
    const timeoutId = setTimeout(async () => {
      try {
        // Save silently - no loading state, no spinners
        setError(null)

        const platformSettings = {
          default_currency: settings.defaultCurrency,
          course_enrollment_notifications: settings.courseEnrollmentNotifications,
          course_completion_notifications: settings.courseCompletionNotifications,
          platform_announcements: settings.platformAnnouncements,
          user_email_notifications: settings.userEmailNotifications,
        }

        await updateSettingsMutation.mutateAsync({ platformSettings })

        // Update initial settings to current values after successful save
        initialSettingsRef.current = {
          ...settings,
        }

        // Save silently - no toast notifications
      } catch (err: any) {
        console.error("Error saving settings:", err)
        setError(err.message || "Failed to save settings")
        // Only show error toast, not success toast
        toast.error(err.message || "Failed to save settings")
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [settings, settingsData, user, userType, updateSettingsMutation])

  // Show skeleton ONLY on true initial load (no cached data exists)
  // Once we have data, never show skeleton again (even during refetches)
  const hasData = settingsData
  const showSkeleton = (authLoading || !user || userType !== "admin") && !hasData

  return (
    <div className="pt-4 md:pt-8">
      {showSkeleton ? (
        <AdminSettingsSkeleton />
      ) : (
        <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Settings</h1>
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg w-full grid grid-cols-4 gap-2">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>Platform</span>
            </TabsTrigger>
            <TabsTrigger value="brand" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span>Brand</span>
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
                      <div className="flex items-center gap-2">
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
                      </div>
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
                        <div className="flex items-center gap-2">
                          <Switch
                            id="course-enrollment-notifications"
                            checked={settings.courseEnrollmentNotifications}
                            onCheckedChange={handleSwitchChange("courseEnrollmentNotifications")}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="course-completion-notifications">Course Completion Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send email notifications when users complete courses
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="course-completion-notifications"
                            checked={settings.courseCompletionNotifications}
                            onCheckedChange={handleSwitchChange("courseCompletionNotifications")}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="platform-announcements">Platform Announcements</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable sending platform-wide announcements to all users
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="platform-announcements"
                            checked={settings.platformAnnouncements}
                            onCheckedChange={handleSwitchChange("platformAnnouncements")}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="user-email-notifications">User Email Notifications (Default)</Label>
                          <p className="text-sm text-muted-foreground">
                            Default email notification preference for new users. Users can change this in their settings.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="user-email-notifications"
                            checked={settings.userEmailNotifications}
                            onCheckedChange={handleSwitchChange("userEmailNotifications")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="brand">
            <BrandSettings />
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
