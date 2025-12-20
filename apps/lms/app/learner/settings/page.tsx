"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import { Bell, Shield, Globe, Loader2 } from "lucide-react"
import { US } from "country-flag-icons/react/3x2"

const NigeriaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3" className="w-4 h-4 mr-2">
    <rect width="6" height="3" fill="#008751" />
    <rect width="2" height="3" x="2" fill="#ffffff" />
  </svg>
)

export default function LearnerSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState({
    emailNotifications: true,
  })
  const [newPassword, setNewPassword] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("USD")

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/learner/login")
    } else {
      setUser(user)
      setSelectedCurrency(user?.currency || "USD")
    }
  }, [router])

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSavePassword = () => {
    console.log("Saving new password:", newPassword)
    setNewPassword("")
    alert("Password updated successfully!")
  }

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency)
    // TODO: Save currency preference to user profile
    console.log("Currency changed to:", currency)
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
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-8">Settings</h1>

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
                onCheckedChange={handleSwitchChange("emailNotifications")}
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
              <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
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
                <Button onClick={handleSavePassword} className="w-full sm:w-auto min-h-[44px]">Save</Button>
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
    </div>
  )
}
