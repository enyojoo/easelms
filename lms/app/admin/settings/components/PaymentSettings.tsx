"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { CreditCard, Globe } from "lucide-react"
import { GB, US, EU } from "country-flag-icons/react/3x2"
import { toast } from "@/components/ui/use-toast"

const NigeriaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3" className="w-4 h-4 mr-2">
    <rect width="6" height="3" fill="#008751" />
    <rect width="2" height="3" x="2" fill="#ffffff" />
  </svg>
)

interface PaymentSettingsProps {
  selectedCurrency: string
  setSelectedCurrency: (currency: string) => void
}

export default function PaymentSettings({
  selectedCurrency,
  setSelectedCurrency,
}: PaymentSettingsProps) {
  const [selectedGateway, setSelectedGateway] = useState("")
  const [gatewayDetails, setGatewayDetails] = useState({
    stripe: { key: "", secret: "", webhook: "", webhookSecret: "" },
    flutterwave: { publicKey: "", secretKey: "", webhookUri: "", secretHash: "" },
    paystack: { publicKey: "", secretKey: "", webhookUri: "" },
    yookassa: { shopId: "", secretKey: "", httpNotifications: "" },
  })

  const handleSaveGatewaySettings = () => {
    if (!selectedGateway) {
      toast({
        title: "Error",
        description: "Please select a payment gateway first",
        variant: "destructive",
      })
      return
    }
    console.log("Saving gateway settings:", selectedGateway, gatewayDetails[selectedGateway as keyof typeof gatewayDetails])
    // Here you would typically send the data to your backend
    toast({
      title: "Success",
      description: "Gateway settings saved successfully",
    })
  }

  const handleGatewayFieldChange = (gateway: string, field: string, value: string) => {
    setGatewayDetails((prev) => ({
      ...prev,
      [gateway]: {
        ...prev[gateway as keyof typeof prev],
        [field]: value,
      },
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" /> Payment Gateway Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Payment Gateway</Label>
            <Select value={selectedGateway} onValueChange={setSelectedGateway}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a payment gateway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">
                  <div className="flex items-center">
                    <Image
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYcX9uh7FHVzyUZuSZmjFeC7W9Dcli8sNg-Q&s"
                      width={24}
                      height={24}
                      alt="Stripe"
                      className="mr-2"
                    />
                    Stripe
                  </div>
                </SelectItem>
                <SelectItem value="flutterwave">
                  <div className="flex items-center">
                    <Image
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTapojSnWH-n-WcVbMRNLe7dfFkBxaT7X8fFg&s"
                      width={24}
                      height={24}
                      alt="Flutterwave"
                      className="mr-2"
                    />
                    Flutterwave
                  </div>
                </SelectItem>
                <SelectItem value="paystack">
                  <div className="flex items-center">
                    <Image
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShqlEP0qWHv6nFrvoiGj1SSyyVuKhVr1-VwA&s"
                      width={24}
                      height={24}
                      alt="Paystack"
                      className="mr-2"
                    />
                    Paystack
                  </div>
                </SelectItem>
                <SelectItem value="yookassa">
                  <div className="flex items-center">
                    <Image
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3_UGKDuvrLR2wBvvkOkJ13m_hoLSbmxRohw&s"
                      width={24}
                      height={24}
                      alt="Yookassa"
                      className="mr-2"
                    />
                    Yookassa
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select a payment gateway and add your API keys to enable payments.
            </p>
          </div>

          {selectedGateway && (
            <Card>
              <CardContent className="space-y-4 mt-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg capitalize">{selectedGateway} Configuration</h3>
                  {Object.entries(gatewayDetails[selectedGateway as keyof typeof gatewayDetails]).map(([field, value]) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`${selectedGateway}-${field}`}>
                        {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")}
                      </Label>
                      <Input
                        id={`${selectedGateway}-${field}`}
                        type={field.toLowerCase().includes("key") || field.toLowerCase().includes("secret") ? "password" : "text"}
                        value={value}
                        onChange={(e) => handleGatewayFieldChange(selectedGateway, field, e.target.value)}
                        placeholder={`Enter ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`}
                      />
                    </div>
                  ))}
                  <Button onClick={handleSaveGatewaySettings} className="w-full">
                    Save Gateway Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-lg font-semibold flex items-center">
            <Globe className="mr-2 h-5 w-5" /> Preferred Currency
          </Label>
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
            This currency will be used for your courses and payouts.
          </p>
        </div>

      </CardContent>
    </Card>
  )
}
