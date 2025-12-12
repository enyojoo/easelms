"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getClientAuthState } from "@/utils/client-auth"
import type { User } from "@/data/users"
import { Bell, Shield, CreditCard } from "lucide-react"
import { US, EU, GB } from "country-flag-icons/react/3x2"

const NigeriaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3" className="w-4 h-4 mr-2">
    <rect width="6" height="3" fill="#008751" />
    <rect width="2" height="3" x="2" fill="#ffffff" />
  </svg>
)

interface CreditCardDetails {
  cardNumber: string
  expiryDate: string
  cvc: string
}

export default function LearnerSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState({
    emailNotifications: true,
  })
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<CreditCardDetails | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("USD")

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "user") {
      router.push("/auth/user/login")
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

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const cardDetails: CreditCardDetails = {
      cardNumber: formData.get("cardNumber") as string,
      expiryDate: formData.get("expiryDate") as string,
      cvc: formData.get("cvc") as string,
    }
    setPaymentDetails(cardDetails)
    setIsPaymentModalOpen(false)
  }

  const renderPaymentDetails = () => {
    if (!paymentDetails) return null

    const maskedCardNumber = `**** **** **** ${paymentDetails.cardNumber.slice(-4)}`
    return (
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">Card Number:</span> {maskedCardNumber}
        </p>
        <p>
          <span className="font-medium">Expiry Date:</span> {paymentDetails.expiryDate}
        </p>
      </div>
    )
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className=" pt-4 md:pt-8">
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
              <span>Email Notifications</span>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={handleSwitchChange("emailNotifications")}
              />
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" /> Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(true)}>
              Add Payment Method
            </Button>
            {paymentDetails && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">Current Payment Method: Credit Card</p>
                {renderPaymentDetails()}
              </div>
            )}
            <div className="mt-4 space-y-2">
              <Label>Display Currency</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
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
                  <SelectItem value="EUR">
                    <div className="flex items-center">
                      <EU className="w-4 h-4 mr-2" />
                      EUR - Euro
                    </div>
                  </SelectItem>
                  <SelectItem value="GBP">
                    <div className="flex items-center">
                      <GB className="w-4 h-4 mr-2" />
                      GBP - British Pound
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

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Delete Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between bg-destructive/10 p-4 rounded-lg">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Once deleted, your account cannot be recovered</p>
              </div>
              <Button variant="destructive">Delete Account</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input id="cardNumber" name="cardNumber" placeholder="1234 5678 9012 3456" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" name="expiryDate" placeholder="MM/YY" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" name="cvc" placeholder="123" required />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Save Card
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
