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
    <div className="pt-4 md:pt-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your courses and account
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                onCheckedChange={handleSwitchChange("emailNotifications")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5" /> Display Currency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select currency" />
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
                This currency will be used to display prices for courses.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Change Password</Label>
              <div className="flex space-x-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-grow"
                />
                <Button onClick={handleSavePassword}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-destructive/10 p-4 rounded-lg">
              <div className="space-y-1">
                <p className="font-medium">Permanently delete your account</p>
                <p className="text-sm text-muted-foreground">Once deleted, your account cannot be recovered</p>
              </div>
              <Button variant="destructive" className="w-full sm:w-auto">Delete Account</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
