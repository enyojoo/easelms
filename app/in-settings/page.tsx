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
import { getClientAuthState } from "@/app/utils/client-auth"
import type { User } from "@/app/data/users"
import {
  Globe,
  Bell,
  Shield,
  CreditCard,
  Puzzle,
  Sparkles,
  Users,
  PaintbrushIcon as PaintBrush,
  CreditCardIcon as PaymentIcon,
  SettingsIcon,
} from "lucide-react"
import Image from "next/image"
import { GB, RU, ES, FR } from "country-flag-icons/react/3x2"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TeamManagement from "./components/TeamManagement"
import PaymentSettings from "./components/PaymentSettings"
import SubscriptionManagement from "./components/SubscriptionManagement"
import BrandingSettings from "./components/BrandingSettings"

const NigeriaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3" className="w-4 h-4 mr-2">
    <rect width="6" height="3" fill="#008751" />
    <rect width="2" height="3" x="2" fill="#ffffff" />
  </svg>
)

type PaymentMethod = "bank" | "stripe" | "paypal" | "usdt"

interface BankDetails {
  accountName: string
  accountNumber: string
  bankName: string
  swiftCode: string
  routingNumber?: string
  iban?: string
}

interface PaymentDetails {
  method: PaymentMethod
  details: {
    bank?: BankDetails
    stripe?: {
      accountId: string
    }
    paypal?: {
      email: string
    }
    usdt?: {
      address: string
    }
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState({
    language: "en",
    emailNotifications: true,
    twoFactorAuth: false,
  })
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("bank")
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("USD")
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [selectedAIModel, setSelectedAIModel] = useState("gpt4")

  useEffect(() => {
    const { isLoggedIn, userType, user } = getClientAuthState()
    if (!isLoggedIn || userType !== "instructor") {
      router.push("/login")
    } else {
      setUser(user)
    }
  }, [router])

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSavePassword = () => {
    console.log("Saving new password:", newPassword)
    setNewPassword("")
    // Show success message
  }

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const details: PaymentDetails["details"] = {}

    switch (selectedPaymentMethod) {
      case "bank":
        details.bank = {
          accountName: formData.get("accountName") as string,
          accountNumber: formData.get("accountNumber") as string,
          bankName: formData.get("bankName") as string,
          swiftCode: formData.get("swiftCode") as string,
          routingNumber: (formData.get("routingNumber") as string) || undefined,
          iban: (formData.get("iban") as string) || undefined,
        }
        break
      case "stripe":
        details.stripe = {
          accountId: formData.get("stripeAccount") as string,
        }
        break
      case "paypal":
        details.paypal = {
          email: formData.get("paypalEmail") as string,
        }
        break
      case "usdt":
        details.usdt = {
          address: formData.get("usdtAccount") as string,
        }
        break
    }

    setPaymentDetails({ method: selectedPaymentMethod, details })
    setIsPaymentModalOpen(false)
  }

  const handleSaveAISettings = () => {
    // In a real application, you would send this to your backend
    console.log("Saving AI Model:", selectedAIModel)
    // Show a success message
    alert("AI settings saved successfully!")
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="pt-4 md:pt-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Settings</h1>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-lg w-full grid grid-cols-6 gap-2">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Team</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <PaintBrush className="h-4 w-4" />
              <span>Branding</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              <span>Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Subscription</span>
            </TabsTrigger>
            <TabsTrigger value="payment-settings" className="flex items-center gap-2">
              <PaymentIcon className="h-4 w-4" />
              <span>Payment</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Globe className="mr-2 h-5 w-5" /> Language
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span>Select your preferred language</span>
                        <Select
                          value={settings.language}
                          onValueChange={(value) => setSettings((prev) => ({ ...prev, language: value }))}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">
                              <div className="flex items-center">
                                <GB className="w-4 h-4 mr-2" />
                                English
                              </div>
                            </SelectItem>
                            <SelectItem value="ru">
                              <div className="flex items-center">
                                <RU className="w-4 h-4 mr-2" />
                                Russian
                              </div>
                            </SelectItem>
                            <SelectItem value="es">
                              <div className="flex items-center">
                                <ES className="w-4 h-4 mr-2" />
                                Spanish
                              </div>
                            </SelectItem>
                            <SelectItem value="fr">
                              <div className="flex items-center">
                                <FR className="w-4 h-4 mr-2" />
                                French
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

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
                      <div className="flex items-center justify-between">
                        <span>Two-Factor Authentication</span>
                        <Switch
                          checked={settings.twoFactorAuth}
                          onCheckedChange={handleSwitchChange("twoFactorAuth")}
                        />
                      </div>
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
                      <CardTitle className="flex items-center">
                        <Sparkles className="mr-2 h-5 w-5" /> AI Model
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {selectedAIModel === "claude" && "Claude 3.5 Sonnet"}
                              {selectedAIModel === "sonar-large" && "Sonar Large"}
                              {selectedAIModel === "gpt4" && "GPT-4o"}
                              {selectedAIModel === "sonar-huge" && "Sonar Huge"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="claude">
                              <div className="flex flex-col">
                                <span>Claude 3.5 Sonnet</span>
                                <span className="text-xs text-muted-foreground">
                                  Most advanced model by Anthropic as of Oct 22
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="sonar-large">
                              <div className="flex flex-col">
                                <span>Sonar Large</span>
                                <span className="text-xs text-muted-foreground">
                                  Advanced model trained by Perplexity based on Llama 3.1 70B
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="gpt4">
                              <div className="flex flex-col">
                                <span>GPT-4o</span>
                                <span className="text-xs text-muted-foreground">Latest advanced model by OpenAI</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="sonar-huge">
                              <div className="flex flex-col">
                                <span>Sonar Huge</span>
                                <span className="text-xs text-muted-foreground">
                                  Advanced model trained by Perplexity based on Llama 3.1 405B
                                </span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Choose the AI model that will be used for content generation.
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
                          <p className="text-sm text-muted-foreground">
                            Once deleted, your account cannot be recovered
                          </p>
                        </div>
                        <Button variant="destructive">Delete Account</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Puzzle className="mr-2 h-5 w-5" /> Integrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center space-x-3">
                      <Image
                        src="https://images-eds-ssl.xboxlive.com/image?url=4rt9.lXDC4H_93laV1_eHHFT949fUipzkiFOBH3fAiZZUCdYojwUyX2aTonS1aIwMrx6NUIsHfUHSLzjGJFxxtPV1zYJfBPveATOCg5xpTuKf9DnYnZDRpyd3X3wPp9S9YzNumGEyH6jVFW5U6OwknNpvw14mhGD9X5lqUW3V0I-&format=source&h=307"
                        alt="Zoom"
                        width={24}
                        height={24}
                        className="rounded"
                        crossOrigin="anonymous"
                      />
                      <span>Zoom Meetings</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Connect</span>
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center space-x-3">
                      <Image
                        src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"
                        alt="Google Calendar"
                        width={24}
                        height={24}
                        className="rounded"
                        crossOrigin="anonymous"
                      />
                      <span>Google Calendar</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Connect</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManagement />
          </TabsContent>

          <TabsContent value="payment-settings">
            <PaymentSettings
              paymentDetails={paymentDetails}
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              setIsPaymentModalOpen={setIsPaymentModalOpen}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Method Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Payout Method</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Select
                value={selectedPaymentMethod}
                onValueChange={(value: PaymentMethod) => setSelectedPaymentMethod(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payout method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="usdt">USDT (TRC-20) </SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPaymentMethod === "bank" && (
              <div className="space-y-2">
                <Input name="accountName" placeholder="Account Name" required />
                <Input name="accountNumber" placeholder="Account Number" required />
                <Input name="bankName" placeholder="Bank Name" required />
                <Input name="swiftCode" placeholder="SWIFT/BIC Code" required />
                <Input name="routingNumber" placeholder="Routing Number (if applicable)" />
                <Input name="iban" placeholder="IBAN (if applicable)" />
              </div>
            )}

            {selectedPaymentMethod === "usdt" && (
              <div className="space-y-2">
                <Input name="usdtAccount" placeholder="Wallet Address" required />
              </div>
            )}

            {selectedPaymentMethod === "paypal" && (
              <div className="space-y-2">
                <Input name="paypalEmail" type="email" placeholder="PayPal Email" required />
              </div>
            )}

            <Button type="submit" className="w-full">
              Add
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
