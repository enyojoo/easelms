"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Image from "next/image"
import { AlertCircle, CreditCard, Wallet, Globe } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { GB, US, EU } from "country-flag-icons/react/3x2"
import { toast } from "@/components/ui/use-toast"

const NigeriaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3" className="w-4 h-4 mr-2">
    <rect width="6" height="3" fill="#008751" />
    <rect width="2" height="3" x="2" fill="#ffffff" />
  </svg>
)

interface PaymentSettingsProps {
  paymentDetails: any
  selectedCurrency: string
  setSelectedCurrency: (currency: string) => void
  setIsPaymentModalOpen: (isOpen: boolean) => void
}

export default function PaymentSettings({
  paymentDetails,
  selectedCurrency,
  setSelectedCurrency,
  setIsPaymentModalOpen,
}: PaymentSettingsProps) {
  const [selectedGateway, setSelectedGateway] = useState({ main: "easnerpay", custom: "" })
  const [customGatewayDetails, setCustomGatewayDetails] = useState({
    stripe: { key: "", secret: "", webhook: "", webhookSecret: "" },
    flutterwave: { publicKey: "", secretKey: "", webhookUri: "", secretHash: "" },
    paystack: { publicKey: "", secretKey: "", webhookUri: "" },
    yookassa: { shopId: "", secretKey: "", httpNotifications: "" },
  })

  const handleSaveGatewaySettings = () => {
    console.log("Saving gateway settings:", selectedGateway, customGatewayDetails)
    // Here you would typically send the data to your backend
    toast.success("Gateway settings saved successfully")
  }

  const renderPaymentDetails = () => {
    if (!paymentDetails) return null

    switch (paymentDetails.method) {
      case "bank":
        return (
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Bank Name:</span> {paymentDetails.details.bank?.bankName}
            </p>
            <p>
              <span className="font-medium">Account Name:</span> {paymentDetails.details.bank?.accountName}
            </p>
            <p>
              <span className="font-medium">Account Number:</span> {paymentDetails.details.bank?.accountNumber}
            </p>
            <p>
              <span className="font-medium">SWIFT Code:</span> {paymentDetails.details.bank?.swiftCode}
            </p>
            {paymentDetails.details.bank?.routingNumber && (
              <p>
                <span className="font-medium">Routing Number:</span> {paymentDetails.details.bank.routingNumber}
              </p>
            )}
            {paymentDetails.details.bank?.iban && (
              <p>
                <span className="font-medium">IBAN:</span> {paymentDetails.details.bank.iban}
              </p>
            )}
          </div>
        )
      case "stripe":
        return (
          <p className="text-sm">
            <span className="font-medium">Stripe Account ID:</span> {paymentDetails.details.stripe?.accountId}
          </p>
        )
      case "paypal":
        return (
          <p className="text-sm">
            <span className="font-medium">PayPal Email:</span> {paymentDetails.details.paypal?.email}
          </p>
        )
      case "usdt":
        return (
          <p className="text-sm">
            <span className="font-medium">USDT Address:</span> {paymentDetails.details.usdt?.address}
          </p>
        )
      default:
        return null
    }
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
          <RadioGroup
            value={selectedGateway.main}
            onValueChange={(value) => setSelectedGateway((prev) => ({ ...prev, main: value, custom: "" }))}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="easnerpay" id="easnerpay" />
              <Label htmlFor="easnerpay">Use EasnerPay (recommended)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Integrate Your Own Gateway</Label>
            </div>
          </RadioGroup>

          {selectedGateway.main === "easnerpay" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>EasnerPay Benefits</AlertTitle>
              <AlertDescription>
                Multiple currency support, no setup needed, secure transactions, and seamless integration.
              </AlertDescription>
            </Alert>
          )}

          {selectedGateway.main === "custom" && (
            <Card>
              <CardContent className="space-y-4 mt-4">
                <div className="space-y-4">
                  <Label>Select Your Gateway</Label>
                  <Select
                    value={selectedGateway.custom}
                    onValueChange={(value) => {
                      setSelectedGateway((prev) => ({ ...prev, custom: value }))
                      // Reset other gateways' details
                      const newDetails = { ...customGatewayDetails }
                      Object.keys(newDetails).forEach((key) => {
                        if (key !== value) {
                          Object.keys(newDetails[key]).forEach((field) => {
                            newDetails[key][field] = ""
                          })
                        }
                      })
                      setCustomGatewayDetails(newDetails)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a gateway" />
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

                  {selectedGateway.main === "custom" && selectedGateway.custom && (
                    <div className="space-y-2">
                      {Object.entries(customGatewayDetails[selectedGateway.custom]).map(([field, value]) => (
                        <div key={field}>
                          <Label htmlFor={`${selectedGateway.custom}-${field}`}>
                            {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1")}
                          </Label>
                          <Input
                            id={`${selectedGateway.custom}-${field}`}
                            value={value}
                            onChange={(e) =>
                              setCustomGatewayDetails({
                                ...customGatewayDetails,
                                [selectedGateway.custom]: {
                                  ...customGatewayDetails[selectedGateway.custom],
                                  [field]: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedGateway.custom && (
                    <Button onClick={handleSaveGatewaySettings} className="mt-4">
                      Save
                    </Button>
                  )}
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
            This currency will be used for your courses, paid workshops, and payouts.
          </p>
        </div>

        {selectedGateway.main === "easnerpay" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Wallet className="mr-2 h-5 w-5" /> Payout Settings
            </h3>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(true)}>
              Set Payout Method
            </Button>
            {paymentDetails && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">
                  Current Payout Method: <span className="capitalize">{paymentDetails.method}</span>
                </p>
                {renderPaymentDetails()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

